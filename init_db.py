import os
import bcrypt
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.environ.get('CLICKHOUSE_HOST', 'localhost')
DB_PORT = os.environ.get('CLICKHOUSE_PORT', '8123')
DB_USER = os.environ.get('CLICKHOUSE_USERNAME', 'default')
DB_PASS = os.environ.get('CLICKHOUSE_PASSWORD', '1234')
DB_NAME = os.environ.get('CLICKHOUSE_DATABASE', 'school_ms')

def run():
    print('🔧  Initializing ClickHouse database…')

    # 1. Connect without DB to create DB
    admin_client = clickhouse_connect.get_client(
        host=DB_HOST,
        port=DB_PORT,
        username=DB_USER,
        password=DB_PASS
    )
    
    admin_client.command(f'CREATE DATABASE IF NOT EXISTS {DB_NAME}')
    print(f'   ✔  Database "{DB_NAME}" ready')

    # 2. Connect to the new DB
    db = clickhouse_connect.get_client(
        host=DB_HOST,
        port=DB_PORT,
        username=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

    # ── Tables ──────────────────────────────────────────
    db.command('''
        CREATE TABLE IF NOT EXISTS teachers (
            id          String,
            name        String,
            email       String,
            phone       String,
            subject     String,
            department  String,
            qualification String,
            experience  UInt8,
            join_date   Date,
            address     String,
            password_hash String,
            status      Enum8('active'=1, 'inactive'=0) DEFAULT 'active',
            created_at  DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY id
    ''')
    print('   ✔  Table "teachers" ready')

    db.command('''
        CREATE TABLE IF NOT EXISTS students (
            id            String,
            name          String,
            email         String,
            phone         String,
            class         String,
            section       String,
            roll_no       UInt16,
            dob           Date,
            gender        Enum8('Male'=1,'Female'=2,'Other'=3),
            address       String,
            parent_name   String,
            parent_phone  String,
            teacher_id    String,
            password_hash String,
            status        Enum8('active'=1, 'inactive'=0) DEFAULT 'active',
            created_at    DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY id
    ''')
    print('   ✔  Table "students" ready')

    db.command('''
        CREATE TABLE IF NOT EXISTS grades (
            id          UUID DEFAULT generateUUIDv4(),
            student_id  String,
            subject     String,
            exam_type   Enum8('Unit Test'=1,'Mid Term'=2,'Final'=3,'Assignment'=4),
            marks       Float32,
            max_marks   Float32,
            exam_date   Date,
            teacher_id  String,
            created_at  DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (student_id, exam_date)
    ''')
    print('   ✔  Table "grades" ready')

    db.command('''
        CREATE TABLE IF NOT EXISTS attendance (
            id          UUID DEFAULT generateUUIDv4(),
            student_id  String,
            date        Date,
            status      Enum8('Present'=1,'Absent'=2,'Late'=3,'Holiday'=4),
            teacher_id  String,
            created_at  DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (student_id, date)
    ''')
    print('   ✔  Table "attendance" ready')

    db.command('''
        CREATE TABLE IF NOT EXISTS announcements (
            id          UUID DEFAULT generateUUIDv4(),
            title       String,
            content     String,
            audience    Enum8('all'=1,'students'=2,'teachers'=3),
            author_id   String,
            created_at  DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY created_at
    ''')
    print('   ✔  Table "announcements" ready')

    # Seed data
    print('\n🌱  Seeding demo data…')
    
    teacher_pw = bcrypt.hashpw(b'teacher123', bcrypt.gensalt()).decode('utf-8')
    student_pw = bcrypt.hashpw(b'student123', bcrypt.gensalt()).decode('utf-8')

    # Teachers
    res = db.query('SELECT count() as c FROM teachers')
    if res.result_rows[0][0] == 0:
        db.insert('teachers', [
            ['TCH001', 'Dr. Meena Iyer', 'meena@school.edu', '9876543210', 'Mathematics', 'Science', 'Ph.D', 12, '2012-06-01', 'Chennai', teacher_pw, 'active'],
            ['TCH002', 'Mr. Ravi Sundaram', 'ravi@school.edu', '9876543211', 'Physics', 'Science', 'M.Sc', 8, '2016-07-15', 'Chennai', teacher_pw, 'active']
        ], column_names=['id','name','email','phone','subject','department','qualification','experience','join_date','address','password_hash','status'])
        print('   ✔  Teachers seeded')

    # Students
    res = db.query('SELECT count() as c FROM students')
    if res.result_rows[0][0] == 0:
        db.insert('students', [
            ['STU001', 'Arjun Sharma', 'arjun@stu.edu', '9123', '10', 'A', 1, '2008-03-15', 'Male', 'Chennai', 'Parent1', '999', 'TCH001', student_pw, 'active'],
            ['STU002', 'Priya Patel', 'priya@stu.edu', '9124', '10', 'A', 2, '2008-07-22', 'Female', 'Chennai', 'Parent2', '998', 'TCH001', student_pw, 'active']
        ], column_names=['id','name','email','phone','class','section','roll_no','dob','gender','address','parent_name','parent_phone','teacher_id','password_hash','status'])
        print('   ✔  Students seeded')

    print('\n✅  Database initialization complete!')

if __name__ == '__main__':
    run()
