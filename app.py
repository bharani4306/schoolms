import os
import datetime
import bcrypt
import jwt
import uuid
import xml.etree.ElementTree as ET
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

DB_FILE = 'db.xml'
JWT_SECRET = os.environ.get('JWT_SECRET', 'school_ms_super_secret_key_2024')

def get_db():
    if not os.path.exists(DB_FILE):
        root = ET.Element('database')
        for table in ['teachers', 'students', 'grades', 'attendance', 'announcements']:
            ET.SubElement(root, table)
        tree = ET.ElementTree(root)
        tree.write(DB_FILE, encoding='utf-8', xml_declaration=True)
    return ET.parse(DB_FILE)

def save_db(tree):
    ET.indent(tree, space="  ", level=0)
    tree.write(DB_FILE, encoding='utf-8', xml_declaration=True)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = data
        except Exception as e:
            return jsonify({'error': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('public', path)

@app.route('/api/health')
def health():
    try:
        get_db()
        return jsonify({'status': 'ok', 'db': 'connected'})
    except:
        return jsonify({'status': 'error', 'db': 'disconnected'}), 500

@app.route('/api/auth/login/student', methods=['POST'])
def login_student():
    data = request.json
    tree = get_db()
    students = tree.getroot().find('students')
    for s in students.findall('student'):
        if s.find('id').text == data['id'] and s.find('status').text == 'active':
            pw_hash = s.find('password_hash').text
            if bcrypt.checkpw(data['password'].encode('utf-8'), pw_hash.encode('utf-8')):
                token = jwt.encode({
                    'id': s.find('id').text, 'name': s.find('name').text, 'role': 'student',
                    'class': s.find('class_name').text, 'section': s.find('section').text,
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
                }, JWT_SECRET, algorithm="HS256")
                return jsonify({'token': token, 'user': {'id': s.find('id').text, 'name': s.find('name').text}, 'role': 'student'})
    return jsonify({'error': 'Invalid ID or password'}), 401

@app.route('/api/auth/login/teacher', methods=['POST'])
def login_teacher():
    data = request.json
    tree = get_db()
    teachers = tree.getroot().find('teachers')
    for t in teachers.findall('teacher'):
        if t.find('id').text == data['id'] and t.find('status').text == 'active':
            pw_hash = t.find('password_hash').text
            if bcrypt.checkpw(data['password'].encode('utf-8'), pw_hash.encode('utf-8')):
                token = jwt.encode({
                    'id': t.find('id').text, 'name': t.find('name').text, 'role': 'teacher',
                    'subject': t.find('subject').text,
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
                }, JWT_SECRET, algorithm="HS256")
                return jsonify({'token': token, 'user': {'id': t.find('id').text, 'name': t.find('name').text}, 'role': 'teacher'})
    return jsonify({'error': 'Invalid ID or password'}), 401

@app.route('/api/students', methods=['GET'])
@token_required
def get_students():
    if request.user.get('role') != 'teacher':
        return jsonify([])
    tree = get_db()
    data = []
    for s in tree.getroot().find('students').findall('student'):
        data.append({
            'id': s.find('id').text,
            'name': s.find('name').text,
            'email': s.find('email').text,
            'phone': s.find('phone').text,
            'class': s.find('class_name').text,
            'section': s.find('section').text,
            'roll_no': s.find('roll_no').text,
            'parent_phone': s.find('parent_phone').text
        })
    return jsonify(data)

@app.route('/api/students/<id>', methods=['GET'])
@token_required
def get_student(id):
    tree = get_db()
    for s in tree.getroot().find('students').findall('student'):
        if s.find('id').text == id:
            return jsonify({
                'id': s.find('id').text,
                'name': s.find('name').text,
                'email': s.find('email').text,
                'phone': s.find('phone').text,
                'class': s.find('class_name').text,
                'section': s.find('section').text,
                'roll_no': s.find('roll_no').text,
                'dob': s.find('dob').text,
                'gender': s.find('gender').text,
                'address': s.find('address').text,
                'parent_name': s.find('parent_name').text,
                'parent_phone': s.find('parent_phone').text,
                'status': s.find('status').text,
                'created_at': s.find('created_at').text
            })
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/students/<id>', methods=['PUT'])
@token_required
def update_student(id):
    if request.user.get('role') != 'teacher':
        return jsonify({'error': 'Access denied'}), 403
    data = request.json
    tree = get_db()
    for s in tree.getroot().find('students').findall('student'):
        if s.find('id').text == id:
            for key in ['name', 'email', 'phone', 'class_name', 'section', 'roll_no', 'address', 'parent_name', 'parent_phone', 'status']:
                if key in data:
                    elem = s.find(key)
                    if elem is None:
                        elem = ET.SubElement(s, key)
                    elem.text = str(data[key])
            save_db(tree)
            return jsonify({'message': 'Student updated successfully'})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/teachers/me', methods=['GET'])
@token_required
def get_teacher_me():
    tree = get_db()
    for t in tree.getroot().find('teachers').findall('teacher'):
        if t.find('id').text == request.user['id']:
            return jsonify({
                'id': t.find('id').text,
                'name': t.find('name').text,
                'email': t.find('email').text,
                'phone': t.find('phone').text,
                'subject': t.find('subject').text,
                'department': t.find('department').text,
                'qualification': t.find('qualification').text,
                'experience': t.find('experience').text,
                'join_date': t.find('join_date').text,
                'address': t.find('address').text,
                'status': t.find('status').text
            })
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/grades/summary', methods=['GET'])
@token_required
def get_grade_summary():
    sid = request.args.get('student_id')
    tree = get_db()
    subjects = {}
    for g in tree.getroot().find('grades').findall('grade'):
        if g.find('student_id').text == sid:
            sub = g.find('subject').text
            pct = (float(g.find('marks').text) / float(g.find('max_marks').text)) * 100
            if sub not in subjects:
                subjects[sub] = {'total_pct': 0, 'count': 0}
            subjects[sub]['total_pct'] += pct
            subjects[sub]['count'] += 1
    
    data = []
    for sub, stats in subjects.items():
        data.append({
            'subject': sub,
            'percentage': stats['total_pct'] / stats['count'],
            'attempts': stats['count']
        })
    return jsonify(data)

@app.route('/api/grades', methods=['GET'])
@token_required
def get_grades():
    sid = request.args.get('student_id')
    tree = get_db()
    data = []
    for g in tree.getroot().find('grades').findall('grade'):
        if not sid or g.find('student_id').text == sid:
            data.append({
                'student_id': g.find('student_id').text,
                'subject': g.find('subject').text,
                'exam_type': g.find('exam_type').text,
                'marks': float(g.find('marks').text),
                'max_marks': float(g.find('max_marks').text),
                'exam_date': g.find('exam_date').text,
                'teacher_id': g.find('teacher_id').text
            })
    # Sort by date descending
    data.sort(key=lambda x: x['exam_date'], reverse=True)
    return jsonify(data)

@app.route('/api/grades', methods=['POST'])
@token_required
def add_grade():
    data = request.json
    tree = get_db()
    grades = tree.getroot().find('grades')
    g = ET.SubElement(grades, 'grade')
    ET.SubElement(g, 'id').text = str(uuid.uuid4())
    ET.SubElement(g, 'student_id').text = data['student_id']
    ET.SubElement(g, 'subject').text = data['subject']
    ET.SubElement(g, 'exam_type').text = data['exam_type']
    ET.SubElement(g, 'marks').text = str(data['marks'])
    ET.SubElement(g, 'max_marks').text = str(data.get('max_marks', 100))
    ET.SubElement(g, 'exam_date').text = data['exam_date']
    ET.SubElement(g, 'teacher_id').text = request.user['id']
    ET.SubElement(g, 'created_at').text = datetime.datetime.utcnow().isoformat()
    save_db(tree)
    return jsonify({'message': 'Success'})

@app.route('/api/attendance/summary', methods=['GET'])
@token_required
def get_att_summary():
    sid = request.args.get('student_id')
    tree = get_db()
    stats = {'Present': 0, 'Absent': 0, 'Late': 0, 'Holiday': 0}
    total = 0
    for a in tree.getroot().find('attendance').findall('record'):
        if a.find('student_id').text == sid:
            status = a.find('status').text
            if status in stats:
                stats[status] += 1
                total += 1
    
    stats['total'] = total
    stats['percentage'] = round(((stats['Present'] + stats['Late'] * 0.5) / total) * 100, 1) if total > 0 else 0
    return jsonify(stats)

@app.route('/api/attendance', methods=['GET'])
@token_required
def get_attendance():
    sid = request.args.get('student_id')
    tree = get_db()
    data = []
    for a in tree.getroot().find('attendance').findall('record'):
        if not sid or a.find('student_id').text == sid:
            data.append({
                'student_id': a.find('student_id').text,
                'date': a.find('date').text,
                'status': a.find('status').text
            })
    data.sort(key=lambda x: x['date'], reverse=True)
    return jsonify(data)

@app.route('/api/attendance', methods=['POST'])
@token_required
def add_attendance():
    records = request.json
    tree = get_db()
    attendance = tree.getroot().find('attendance')
    for r in records:
        a = ET.SubElement(attendance, 'record')
        ET.SubElement(a, 'id').text = str(uuid.uuid4())
        ET.SubElement(a, 'student_id').text = r['student_id']
        ET.SubElement(a, 'date').text = r['date']
        ET.SubElement(a, 'status').text = r['status']
        ET.SubElement(a, 'teacher_id').text = request.user['id']
        ET.SubElement(a, 'created_at').text = datetime.datetime.utcnow().isoformat()
    save_db(tree)
    return jsonify({'message': 'Success'})

@app.route('/api/announcements', methods=['GET'])
@token_required
def get_announcements():
    tree = get_db()
    role = request.user.get('role')
    allowed = ['all', 'students'] if role == 'student' else ['all', 'teachers']
    data = []
    for a in tree.getroot().find('announcements').findall('announcement'):
        if a.find('audience').text in allowed:
            data.append({
                'title': a.find('title').text,
                'content': a.find('content').text,
                'audience': a.find('audience').text,
                'author_id': a.find('author_id').text,
                'created_at': a.find('created_at').text
            })
    data.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify(data)

@app.route('/api/announcements', methods=['POST'])
@token_required
def add_announcement():
    data = request.json
    tree = get_db()
    announcements = tree.getroot().find('announcements')
    a = ET.SubElement(announcements, 'announcement')
    ET.SubElement(a, 'id').text = str(uuid.uuid4())
    ET.SubElement(a, 'title').text = data['title']
    ET.SubElement(a, 'content').text = data['content']
    ET.SubElement(a, 'audience').text = data.get('audience', 'all')
    ET.SubElement(a, 'author_id').text = request.user['id']
    ET.SubElement(a, 'created_at').text = datetime.datetime.utcnow().isoformat()
    save_db(tree)
    return jsonify({'message': 'Success'})

if __name__ == '__main__':
    app.run(port=3000, debug=True)
