from flask import Flask, render_template, request, jsonify
import os
import json

app = Flask(__name__, static_folder='static', static_url_path='/static')

# Archivo para almacenar los puntos guardados
POINTS_FILE = 'puntos_guardados.json'

def cargar_puntos():
    """Carga los puntos guardados desde el archivo JSON"""
    if os.path.exists(POINTS_FILE):
        with open(POINTS_FILE, 'r') as f:
            return json.load(f)
    return []

def guardar_puntos(puntos):
    """Guarda los puntos en el archivo JSON"""
    with open(POINTS_FILE, 'w') as f:
        json.dump(puntos, f, indent=2)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/map')
def mapa():
    return render_template('map.html')

@app.route('/guardar_punto', methods=['POST'])
def guardar_punto():
    """Endpoint para guardar un punto de ubicación"""
    try:
        data = request.get_json()
        
        if not data or 'latitude' not in data or 'longitude' not in data:
            return jsonify({'error': 'Datos incompletos'}), 400
        
        # Cargar puntos existentes
        puntos = cargar_puntos()
        
        # Agregar nuevo punto
        nuevo_punto = {
            'latitude': data['latitude'],
            'longitude': data['longitude']
        }
        puntos.append(nuevo_punto)
        
        # Guardar en archivo
        guardar_puntos(puntos)
        
        return jsonify({'success': True, 'message': 'Punto guardado exitosamente'}), 200
    except Exception as e:
        print(f"Error al guardar punto: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)