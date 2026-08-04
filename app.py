import os
import sys
import sqlite3
import datetime
import mimetypes
from contextlib import contextmanager
from flask import Flask, render_template, request, jsonify, send_from_directory

# Windows 11 콘솔 인코딩 호환성 설정
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MAX_NAME_LENGTH = 20
MAX_MESSAGE_LENGTH = 200


def resolve_db_path():
    configured_path = os.environ.get('GUESTBOOK_DB_PATH', 'guestbook.db')
    if os.path.isabs(configured_path):
        return configured_path
    return os.path.join(BASE_DIR, configured_path)


DB_PATH = resolve_db_path()


def get_port():
    try:
        return int(os.environ.get('PORT', '5000'))
    except ValueError:
        return 5000


def env_flag(name, default=False):
    return os.environ.get(name, str(default)).lower() in {'1', 'true', 'yes', 'on'}

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def db_connection():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """DB 테이블 자동 생성 및 기본 데이터 삽입 (Windows 11 디버깅 용이성 극대화)"""
    os.makedirs(os.path.dirname(DB_PATH) or '.', exist_ok=True)
    with db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS guestbook (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')

    # 방명록은 실제 방문자가 남긴 메시지만 저장합니다. 샘플 데이터는 넣지 않습니다.

# 앱 시작 시 DB 초기화
init_db()

@app.route('/')
def home():
    """메인 개인 소개 페이지"""
    return render_template('index.html')

@app.route('/image/<path:filename>')
def serve_image(filename):
    r"""C:\Jungle\project1\image 폴더의 이미지 제공"""
    mimetype, _ = mimetypes.guess_type(filename)
    if filename.lower().endswith('.webp'):
        mimetype = 'image/webp'
    return send_from_directory(os.path.join(BASE_DIR, 'image'), filename, mimetype=mimetype)

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 헬스 체크 API"""
    return jsonify({
        "status": "ok",
        "environment": os.environ.get('APP_ENV', 'development'),
        "framework": "Flask 3.x",
        "timestamp": datetime.datetime.now().isoformat(timespec='seconds'),
        "database": "SQLite"
    }), 200

@app.route('/api/guestbook', methods=['GET'])
def get_guestbook():
    """방명록 목록 조회 REST API"""
    try:
        with db_connection() as conn:
            messages = conn.execute('SELECT * FROM guestbook ORDER BY id DESC').fetchall()
        
        result = [
            {
                "id": row["id"],
                "name": row["name"],
                "message": row["message"],
                "created_at": row["created_at"]
            } for row in messages
        ]
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        app.logger.error(f"[DB ERROR] 방명록 조회 실패: {str(e)}")
        return jsonify({"success": False, "error": "데이터베이스 조회 오류"}), 500

@app.route('/api/guestbook', methods=['POST'])
def add_guestbook():
    """방명록 등록 REST API"""
    if not request.is_json:
        return jsonify({"success": False, "error": "JSON 형식의 요청이 필요합니다."}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"success": False, "error": "요청 본문 형식이 올바르지 않습니다."}), 400

    name = data.get('name')
    message = data.get('message')
    if not isinstance(name, str) or not isinstance(message, str):
        return jsonify({"success": False, "error": "이름과 메시지는 문자열이어야 합니다."}), 400

    name = name.strip()
    message = message.strip()
    if not name or not message:
        return jsonify({"success": False, "error": "이름과 메시지를 모두 입력해주세요."}), 400
    if len(name) > MAX_NAME_LENGTH:
        return jsonify({"success": False, "error": f"이름은 {MAX_NAME_LENGTH}자 이내로 입력해주세요."}), 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({"success": False, "error": f"메시지는 {MAX_MESSAGE_LENGTH}자 이내로 입력해주세요."}), 400

    created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO guestbook (name, message, created_at) VALUES (?, ?, ?)', (name, message, created_at))
            new_id = cursor.lastrowid
        
        return jsonify({
            "success": True,
            "message": "방명록이 성공적으로 등록되었습니다.",
            "data": {
                "id": new_id,
                "name": name,
                "message": message,
                "created_at": created_at
            }
        }), 201
    except Exception as e:
        app.logger.error(f"[DB ERROR] 방명록 등록 실패: {str(e)}")
        return jsonify({"success": False, "error": "방명록 저장 실패"}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "요청하신 경로를 찾을 수 없습니다."}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "error": "지원하지 않는 요청 방식입니다."}), 405

if __name__ == '__main__':
    print("=" * 60)
    print("[SERVER] Krafton Web Dev Camp - Project 1 Flask Server")
    host = os.environ.get('HOST', '127.0.0.1')
    port = get_port()
    debug = env_flag('DEBUG', os.environ.get('APP_ENV', 'development') != 'production')
    print(f"[ENV] {os.environ.get('APP_ENV', 'development')}")
    print(f"[DEBUG] Debug Mode: {'Active' if debug else 'Disabled'}")
    print(f"[URL] Local Access: http://{host}:{port}")
    print("=" * 60)
    app.run(host=host, port=port, debug=debug)
