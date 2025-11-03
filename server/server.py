from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sqlite3
import hashlib
import socket
import os


class Database:
    def __init__(self):
        self.conn = sqlite3.connect('map.db', check_same_thread=False)
        self.create_tables()
        self.create_test_users()

    def create_tables(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS placemarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                photo TEXT,
                author_id INTEGER NOT NULL,
                author_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users (id)
            )
        ''')
        self.conn.commit()

    def create_test_users(self):
        cursor = self.conn.cursor()
        test_users = [
            ('admin', hashlib.md5('admin123'.encode()).hexdigest(), 'Администратор', 'admin@example.com'),
            ('user', hashlib.md5('user123'.encode()).hexdigest(), 'Обычный пользователь', 'user@example.com')
        ]
        for username, password, name, email in test_users:
            cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
            if not cursor.fetchone():
                cursor.execute('INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)',
                               (username, password, name, email))
        self.conn.commit()

    def register_user(self, username, password, name, email=None):
        cursor = self.conn.cursor()
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            return False, "Пользователь с таким логином уже существует"
        password_hash = hashlib.md5(password.encode()).hexdigest()
        try:
            cursor.execute('INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)',
                           (username, password_hash, name, email))
            self.conn.commit()
            return True, "Пользователь успешно зарегистрирован"
        except Exception as e:
            return False, f"Ошибка регистрации: {str(e)}"

    def login(self, username, password):
        cursor = self.conn.cursor()
        password_hash = hashlib.md5(password.encode()).hexdigest()
        cursor.execute('SELECT * FROM users WHERE username = ? AND password = ?',
                       (username, password_hash))
        user = cursor.fetchone()
        if user:
            return {
                'id': user[0],
                'username': user[1],
                'name': user[3],
                'email': user[4]
            }
        return None

    def get_placemarks(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT p.*, u.name as author_name 
            FROM placemarks p 
            LEFT JOIN users u ON p.author_id = u.id 
            ORDER BY p.created_at DESC
        ''')
        result = []
        for row in cursor.fetchall():
            result.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'type': row[3],
                'lat': row[4],
                'lng': row[5],
                'photo': row[6],
                'authorId': row[7],
                'authorName': row[9],
                'createdAt': row[10]
            })
        return result

    def create_placemark(self, data, user_id, username):
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO placemarks (name, description, type, lat, lng, photo, author_id, author_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data['name'], data['description'], data['type'],
              data['lat'], data['lng'], data.get('photo', ''), user_id, username))
        self.conn.commit()
        return cursor.lastrowid

    def delete_placemark(self, placemark_id, user_id):
        cursor = self.conn.cursor()
        cursor.execute('SELECT author_id FROM placemarks WHERE id = ?', (placemark_id,))
        placemark = cursor.fetchone()
        if placemark and placemark[0] == user_id:
            cursor.execute('DELETE FROM placemarks WHERE id = ?', (placemark_id,))
            self.conn.commit()
            return cursor.rowcount > 0
        return False


class MapHandler(BaseHTTPRequestHandler):
    db = Database()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/auth/register':
            self.handle_register()
        elif self.path == '/api/auth/login':
            self.handle_login()
        elif self.path == '/api/placemarks':
            self.handle_create_placemark()
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == '/api/placemarks':
            self.handle_get_placemarks()
        elif self.path == '/api/info':
            self.handle_get_info()
        else:
            self.serve_static_file()

    def do_DELETE(self):
        if self.path.startswith('/api/placemarks/'):
            placemark_id = self.path.split('/')[-1]
            if placemark_id.isdigit():
                self.handle_delete_placemark(int(placemark_id))
            else:
                self.send_error(400, "Invalid placemark ID")
        else:
            self.send_error(404)

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def serve_static_file(self):
        if self.path == '/':
            file_path = 'client/index.html'
        else:
            file_path = 'client' + self.path
        if os.path.exists(file_path) and os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            content_type = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.ico': 'image/x-icon'
            }.get(ext, 'text/plain')
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"Error reading file: {e}")
        else:
            try:
                with open('client/index.html', 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(content)
            except:
                self.send_error(404, "File not found")

    def handle_register(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                raise ValueError("No data")
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
        except:
            self.send_json_response({'success': False, 'message': 'Invalid JSON'}, 400)
            return

        username = data.get('username', '').strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()

        if not username or not password or not name:
            self.send_json_response({'success': False, 'message': 'Username, password and name are required'}, 400)
            return
        if len(username) < 3:
            self.send_json_response({'success': False, 'message': 'Username must be at least 3 characters'}, 400)
            return
        if len(password) < 6:
            self.send_json_response({'success': False, 'message': 'Password must be at least 6 characters'}, 400)
            return

        success, message = self.db.register_user(username, password, name, email)
        if success:
            self.send_json_response({
                'success': True,
                'message': message,
                'user': {'username': username, 'name': name}
            }, 201)
        else:
            self.send_json_response({'success': False, 'message': message}, 400)

    def handle_login(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
        except:
            self.send_json_response({'success': False, 'message': 'Invalid JSON'}, 400)
            return

        username = data.get('username')
        password = data.get('password')
        user = self.db.login(username, password)
        if user:
            self.send_json_response({
                'success': True,
                'token': f"token-{user['id']}-{user['username']}",
                'user': user
            })
        else:
            self.send_json_response({
                'success': False,
                'message': 'Неверный логин или пароль'
            }, 401)

    def handle_get_placemarks(self):
        placemarks = self.db.get_placemarks()
        self.send_json_response(placemarks)

    def handle_create_placemark(self):
        user_id = 1
        username = 'user'
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('token-'):
            try:
                parts = auth_header.split('-')
                user_id = int(parts[1])
                username = parts[2]
            except:
                pass

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
        except:
            self.send_json_response({'success': False, 'message': 'Invalid JSON'}, 400)
            return

        placemark_id = self.db.create_placemark(data, user_id, username)
        self.send_json_response({
            'success': True,
            'message': 'Placemark created',
            'id': placemark_id
        }, 201)

    def handle_delete_placemark(self, placemark_id):
        user_id = 1
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('token-'):
            try:
                parts = auth_header.split('-')
                user_id = int(parts[1])
            except:
                pass

        success = self.db.delete_placemark(placemark_id, user_id)
        if success:
            self.send_json_response({'success': True, 'message': 'Placemark deleted'})
        else:
            self.send_json_response({'success': False, 'message': 'Cannot delete this placemark'}, 403)

    def handle_get_info(self):
        info = {
            'server': 'Street Omsk Map Server',
            'version': '1.0',
            'features': ['registration', 'login', 'placemarks']
        }
        self.send_json_response(info)

    def log_message(self, format, *args):
        client_ip = self.client_address[0]
        print(f"{client_ip} - {format % args}")


def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "неизвестен"


if __name__ == '__main__':
    port = 3000
    server_ip = get_ip_address()
    print('=' * 50)
    print(' Street Omsk Server')
    print('=' * 50)
    print(f'Сервер запущен на порту: {port}')
    print(f'Локальный доступ: http://localhost:{port}')
    print(f'Сетевой доступ: http://{server_ip}:{port}')
    print('-' * 50)
    print('Логин / Пароль для теста:')
    print('admin / admin123')
    print('user / user123')
    print('-' * 50)
    print('Для остановки сервера нажмите Ctrl+C')
    print('=' * 50)

    try:
        server = HTTPServer(('0.0.0.0', port), MapHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nСервер остановлен')
    except Exception as e:
        print(f'Ошибка: {e}')
