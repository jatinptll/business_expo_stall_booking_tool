import os
import json
import uuid
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.permanent_session_lifetime = timedelta(hours=2)

# === MONGODB CONNECTION ===
MONGO_URI = os.getenv("MONGODB_URI")
db = None

try:
    import certifi
    if not MONGO_URI:
        raise ValueError("MONGODB_URI is not set in .env")
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=2000)
    # Test connection
    client.server_info()
    db = client.EXPO_2026
    print("✅ Connected to MongoDB (EXPO_2026)")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    # Warn but don't crash start-up, requests will fail gracefully

# Admin credentials (hardcoded for now, but in prod should be in DB)
# Admin credentials
ADMIN_CREDENTIALS = {
    os.getenv("ADMIN_USERNAME", "admin"): os.getenv("ADMIN_PASSWORD", "admin2026")
}

# === UTILITY FUNCTIONS ===

def check_db():
    if db is None:
        raise Exception("Database not connected. Please check MONGODB_URI in .env")

def generate_request_id():
    return f"REQ_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6].upper()}"

# === USER MANAGEMENT ===

def get_user(email):
    if db is None: return None
    return db.users.find_one({"email": email.lower()})

def save_user(user_data):
    check_db()
    db.users.update_one(
        {"email": user_data['email'].lower()},
        {"$set": user_data},
        upsert=True
    )
    return True

def authenticate_user(email, password):
    user = get_user(email)
    if user and check_password_hash(user.get('password_hash', ''), password):
        # Convert ObjectId to string for session or JSON if needed, though we don't return full user obj usually
        if '_id' in user: user['_id'] = str(user['_id'])
        return user
    return None

@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP errors
    if hasattr(e, 'code'):
        return e
    return jsonify({"error": str(e)}), 500

# === ROUTES ===

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/admin')
def admin_panel():
    return render_template('admin.html')

# === PUBLIC ENDPOINTS (No Auth Required) ===

@app.route('/api/stalls', methods=['GET'])
def get_stalls():
    """Get combined stall status (available, pending, confirmed)."""
    if db is None:
        return jsonify({})

    stall_status = {}
    
    # 1. Get Confirmed Bookings
    bookings = list(db.bookings.find({}, {'_id': 0}))
    for b in bookings:
        stall_status[b['stall_id']] = {
            'status': 'confirmed',
            'company_name': b.get('company_name', 'Reserved'),
            'contact_person': b.get('contact_person', ''),
            # Phone removed for privacy
            'category': b.get('category', ''),
            'confirmed_at': b.get('confirmed_at', '')
        }
    
    # 2. Get Pending Requests (Override if not confirmed yet)
    # Note: Logic usually implies a pending request shouldn't override a confirmed one, 
    # but let's check stall availability first.
    pending_requests = list(db.requests.find({"status": "pending"}, {'_id': 0}))
    
    for req in pending_requests:
        stall_id = req.get('stall_id')
        # Only show as pending if not already confirmed
        if stall_id and stall_id not in stall_status:
            stall_status[stall_id] = {
                'status': 'pending',
                'company_name': req.get('company', 'Pending...'),
                'request_id': req.get('request_id')
            }
    
    return jsonify(stall_status)

@app.route('/api/stall/<stall_id>', methods=['GET'])
def get_stall_details(stall_id):
    """Get detailed info for a specific stall."""
    # Check confirmed
    booking = db.bookings.find_one({"stall_id": stall_id}, {'_id': 0})
    if booking:
        return jsonify({
            'status': 'confirmed',
            'stall_id': stall_id,
            'company_name': booking.get('company_name', ''),
            'contact_person': booking.get('contact_person', ''),
            # Phone removed for privacy
            'category': booking.get('category', ''),
            'confirmed_at': booking.get('confirmed_at', '')
        })
    
    # Check pending
    req = db.requests.find_one({"stall_id": stall_id, "status": "pending"}, {'_id': 0})
    if req:
        return jsonify({
            'status': 'pending',
            'stall_id': stall_id,
            'company_name': req.get('company', ''),
            'message': 'Booking request is pending admin approval'
        })
    
    # Available
    return jsonify({
        'status': 'available',
        'stall_id': stall_id
    })

# === USER AUTH ENDPOINTS ===

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').lower().strip()
    
    required = ['name', 'company', 'email', 'phone', 'password', 'category']
    if not all(data.get(f) for f in required):
        return jsonify({'error': 'All required fields must be filled'}), 400
    
    if get_user(email):
        return jsonify({'error': 'Email already registered. Please login.'}), 400
    
    user_data = {
        'name': data['name'],
        'company': data['company'],
        'email': email,
        'phone': data['phone'],
        'category': data['category'],
        'password_hash': generate_password_hash(data['password']),
        'registered_at': datetime.now().isoformat(),
        'bookings': []
    }
    
    save_user(user_data)
    
    session.permanent = True
    session['user'] = {
        'email': email,
        'name': user_data['name'],
        'company': user_data['company'],
        'phone': user_data['phone']
    }
    
    return jsonify({'success': True, 'user': session['user']})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    
    user = authenticate_user(email, password)
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    session.permanent = True
    session['user'] = {
        'email': email,
        'name': user['name'],
        'company': user['company'],
        'phone': user.get('phone', '')
    }
    
    return jsonify({'success': True, 'user': session['user']})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    session.pop('admin', None)
    return jsonify({'success': True})

@app.route('/api/me', methods=['GET'])
def get_current_user():
    if 'user' not in session: return jsonify(None)
    
    email = session['user']['email']
    user = db.users.find_one({"email": email}, {"_id":0, "password_hash":0})
    
    if not user:
        # Should not happen if session exists but for safety
        session.pop('user', None)
        return jsonify(None)
    
    # Enrich with booking data
    # 1. Confirmed bookings from bookings collection
    confirmed = list(db.bookings.find({"user_email": email}, {"_id":0}))
    for b in confirmed:
        b['status'] = 'confirmed'
        # Ensure date field exists for sorting/display
        if 'requested_at' not in b: b['requested_at'] = b.get('confirmed_at')
        
    # 2. Pending/Rejected requests from requests collection
    # We exclude 'confirmed' requests here because we use the bookings collection for those
    requests = list(db.requests.find({
        "user_email": email, 
        "status": {"$ne": "confirmed"}
    }, {"_id":0}))
    
    # Combine
    combined_bookings = confirmed + requests
    
    # Sort by date (newest first)
    combined_bookings.sort(key=lambda x: x.get('requested_at') or '', reverse=True)
    
    user['bookings'] = combined_bookings
    
    return jsonify(user)

# === BOOKING REQUEST ENDPOINTS ===

@app.route('/api/booking-request', methods=['POST'])
def submit_booking_request():
    """Submit a new booking request (requires user login)."""
    if 'user' not in session:
        return jsonify({'error': 'Please login or register first'}), 401
    
    data = request.json
    stall_id = str(data.get('stall_id'))
    
    # Check if stall is already booked
    if db.bookings.find_one({"stall_id": stall_id}):
        return jsonify({'error': 'This stall is already booked'}), 400
    
    # Check if pending request exists
    if db.requests.find_one({"stall_id": stall_id, "status": "pending"}):
        return jsonify({'error': 'This stall already has a pending booking request'}), 400
    
    user = session['user']
    request_id = generate_request_id()
    
    request_data = {
        'request_id': request_id,
        'stall_id': stall_id,
        'stall_type': data.get('stall_type', 'Standard'),
        'stall_price': data.get('stall_price', 500),
        'user_email': user['email'],
        'name': user['name'],
        'company': user['company'],
        'phone': user['phone'],
        'category': data.get('category', ''),
        'booked_by': data.get('booked_by', ''),
        'status': 'pending',
        'requested_at': datetime.now().isoformat()
    }
    
    db.requests.insert_one(request_data)
    
    return jsonify({
        'success': True,
        'request_id': request_id,
        'message': 'Your booking request has been submitted. Awaiting admin approval.'
    })

@app.route('/api/my-requests', methods=['GET'])
def get_my_requests():
    """Get current user's booking requests."""
    if 'user' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    email = session['user']['email']
    
    my_requests = list(db.requests.find({"user_email": email}, {'_id': 0}))
    my_bookings = list(db.bookings.find({"user_email": email}, {'_id': 0}))
    
    return jsonify({
        'pending_requests': [r for r in my_requests if r['status'] == 'pending'],
        'confirmed_bookings': my_bookings,
        'rejected_requests': [r for r in my_requests if r['status'] == 'rejected']
    })

# === ADMIN ENDPOINTS ===

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username', '')
    password = data.get('password', '')
    
    if username in ADMIN_CREDENTIALS and ADMIN_CREDENTIALS[username] == password:
        session.permanent = True
        session['admin'] = {'username': username}
        return jsonify({'success': True, 'admin': session['admin']})
    
    return jsonify({'error': 'Invalid admin credentials'}), 401

@app.route('/api/admin/check', methods=['GET'])
def check_admin():
    if 'admin' in session:
        return jsonify({'logged_in': True, 'admin': session['admin']})
    return jsonify({'logged_in': False})

@app.route('/api/admin/pending-requests', methods=['GET'])
def get_pending_requests():
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
    
    # Return as dict for frontend compatibility (or list if FE can handle it, 
    # but existing code expects object with ID keys? 
    # Actually the current frontend expects an object {req_id: {...}}.
    # Let's verify... `Object.entries(pendingRequests)` in FE.
    # So we need to return a dictionary keyed by request_id.
    
    requests_list = list(db.requests.find({"status": "pending"}, {'_id': 0}))
    requests_dict = {r['request_id']: r for r in requests_list}
    return jsonify(requests_dict)

@app.route('/api/admin/all-requests', methods=['GET'])
def get_all_requests():
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
        
    requests_list = list(db.requests.find({}, {'_id': 0}))
    return jsonify({r['request_id']: r for r in requests_list})

@app.route('/api/admin/confirm-booking/<request_id>', methods=['POST'])
def confirm_booking(request_id):
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
    
    req = db.requests.find_one({"request_id": request_id})
    if not req:
        return jsonify({'error': 'Request not found'}), 404
    
    stall_id = req['stall_id']
    
    if db.bookings.find_one({"stall_id": stall_id}):
        return jsonify({'error': 'Stall already has a confirmed booking'}), 400
    
    # Create confirmed booking
    booking_data = {
        'stall_id': stall_id,
        'booked': True,
        'request_id': request_id,
        'user_email': req['user_email'],
        'company_name': req['company'],
        'contact_person': req['name'],
        'phone': req['phone'],
        'category': req['category'],
        'booked_by': req.get('booked_by', ''),
        'stall_type': req.get('stall_type', 'Standard'),
        'stall_price': req.get('stall_price', 500),
        'confirmed_at': datetime.now().isoformat(),
        'confirmed_by': session['admin']['username']
    }
    
    # Transaction-like update
    db.bookings.insert_one(booking_data)
    
    db.requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "confirmed",
            "confirmed_at": datetime.now().isoformat()
        }}
    )
    
    # Update user's booking list
    db.users.update_one(
        {"email": req['user_email']},
        {"$push": {"bookings": stall_id}}
    )
    
    return jsonify({'success': True, 'message': f'Stall {stall_id} booking confirmed'})

@app.route('/api/admin/reject-booking/<request_id>', methods=['POST'])
def reject_booking(request_id):
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json or {}
    reason = data.get('reason', 'Request rejected by admin')
    
    result = db.requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.now().isoformat(),
            "rejection_reason": reason
        }}
    )
    
    if result.matched_count == 0:
        return jsonify({'error': 'Request not found'}), 404
    
    return jsonify({'success': True, 'message': 'Booking request rejected'})

@app.route('/api/admin/cancel-booking/<stall_id>', methods=['DELETE'])
def admin_cancel_booking(stall_id):
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
    
    # Find the booking to get request_id if we want to update request status back?
    # Or just delete the booking.
    # The requirement says cancel booking. Let's delete from bookings collection.
    
    result = db.bookings.delete_one({"stall_id": stall_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Booking not found'}), 404
        
    # Optional: Should we set related request back to something? 
    # For now, just deleting the booking frees the stall. 
    
    return jsonify({'success': True, 'message': f'Stall {stall_id} booking cancelled'})

@app.route('/api/admin/confirmed-bookings', methods=['GET'])
def get_confirmed_bookings():
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
        
    # Frontend expects dict {stall_id: booking_data}
    bookings_list = list(db.bookings.find({}, {'_id': 0}))
    return jsonify({b['stall_id']: b for b in bookings_list})

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
    
    users_list = list(db.users.find({}, {'_id': 0, 'password_hash': 0}))
    # Frontend expects dict {email: user_data}
    return jsonify({u['email']: u for u in users_list})

@app.route('/api/admin/stats', methods=['GET'])
def get_stats():
    if 'admin' not in session:
        return jsonify({'error': 'Admin access required'}), 403
    
    total_users = db.users.count_documents({})
    confirmed_count = db.bookings.count_documents({})
    pending_count = db.requests.count_documents({"status": "pending"})
    
    # Revenue calc
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$stall_price"}}}
    ]
    revenue_res = list(db.bookings.aggregate(pipeline))
    total_revenue = revenue_res[0]['total'] if revenue_res else 0
    
    return jsonify({
        'total_stalls': 119,
        'available': 119 - confirmed_count - pending_count,
        'pending': pending_count,
        'confirmed': confirmed_count,
        'total_users': total_users,
        'total_revenue': total_revenue
    })

if __name__ == '__main__':
    print("🎪 Nexus Fair Server Running (MongoDB Edition)")
    print("📍 Main Site: http://localhost:8080")
    print("🔐 Admin Panel: http://localhost:8080/admin")
    print("━" * 40)
    app.run(port=8080, debug=True)
