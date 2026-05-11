import os
import xml.etree.ElementTree as ET
import bcrypt

DB_FILE = 'db.xml'

def run():
    print(f'🔧  Initializing XML database at {DB_FILE}…')

    root = ET.Element('database')
    
    teachers = ET.SubElement(root, 'teachers')
    students = ET.SubElement(root, 'students')
    grades = ET.SubElement(root, 'grades')
    attendance = ET.SubElement(root, 'attendance')
    announcements = ET.SubElement(root, 'announcements')

    # Seed data
    print('🌱  Seeding demo data…')
    
    teacher_pw = bcrypt.hashpw(b'teacher123', bcrypt.gensalt()).decode('utf-8')
    student_pw = bcrypt.hashpw(b'student123', bcrypt.gensalt()).decode('utf-8')

    # Teachers
    t_data = [
        {'id': 'TCH001', 'name': 'Dr. Meena Iyer', 'email': 'meena@school.edu', 'phone': '9876543210', 'subject': 'Mathematics', 'department': 'Science', 'qualification': 'Ph.D', 'experience': '12', 'join_date': '2012-06-01', 'address': 'Chennai', 'password_hash': teacher_pw, 'status': 'active'},
        {'id': 'TCH002', 'name': 'Mr. Ravi Sundaram', 'email': 'ravi@school.edu', 'phone': '9876543211', 'subject': 'Physics', 'department': 'Science', 'qualification': 'M.Sc', 'experience': '8', 'join_date': '2016-07-15', 'address': 'Chennai', 'password_hash': teacher_pw, 'status': 'active'}
    ]
    for data in t_data:
        t = ET.SubElement(teachers, 'teacher')
        for k, v in data.items():
            ET.SubElement(t, k).text = v

    # Students
    s_data = [
        {'id': 'STU001', 'name': 'Arjun Sharma', 'email': 'arjun@stu.edu', 'phone': '9123', 'class_name': '10', 'section': 'A', 'roll_no': '1', 'dob': '2008-03-15', 'gender': 'Male', 'address': 'Chennai', 'parent_name': 'Parent1', 'parent_phone': '999', 'teacher_id': 'TCH001', 'password_hash': student_pw, 'status': 'active', 'created_at': '2024-01-01T00:00:00'},
        {'id': 'STU002', 'name': 'Priya Patel', 'email': 'priya@stu.edu', 'phone': '9124', 'class_name': '10', 'section': 'A', 'roll_no': '2', 'dob': '2008-07-22', 'gender': 'Female', 'address': 'Chennai', 'parent_name': 'Parent2', 'parent_phone': '998', 'teacher_id': 'TCH001', 'password_hash': student_pw, 'status': 'active', 'created_at': '2024-01-01T00:00:00'}
    ]
    for data in s_data:
        s = ET.SubElement(students, 'student')
        for k, v in data.items():
            ET.SubElement(s, k).text = v

    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ", level=0)
    tree.write(DB_FILE, encoding='utf-8', xml_declaration=True)
    
    print('   ✔  XML Database created and seeded.')
    print('✅  Initialization complete!')

if __name__ == '__main__':
    run()
