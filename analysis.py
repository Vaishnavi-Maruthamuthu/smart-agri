import firebase_admin
from firebase_admin import credentials, db
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta
import json
from flask import Flask, jsonify
from flask_cors import CORS

# ---- Setup ----
cred = credentials.Certificate("YOUR_SERVICE_ACCOUNT.json")
if not firebase_admin._apps:
firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://cropmonitor-a98b8-default-rtdb.firebaseio.com/'
})

def fetch_current_sensor_data():
    ref = db.reference('SensorData')
data = ref.get()
    return data or {}

def load_local_history_csv(path: str = "datasets/history_sample.csv"):
    try:
        df = pd.read_csv(path, parse_dates=[0])
        df.columns = [c.strip().lower() for c in df.columns]
        # Ensure required columns exist
        required = {"timestamp","temperature","humidity","moisture","ph"}
        if not required.issubset(set(df.columns)):
            return None
        df.sort_values("timestamp", inplace=True)
        return df
    except Exception:
        return None

# ---- Crop Database with Optimal Conditions ----
CROP_DATABASE = {
    'wheat': {
        'optimal_temp': (15, 25),
        'optimal_humidity': (40, 70),
        'optimal_moisture': (50, 80),
        'optimal_ph': (6.0, 7.5),
        'season': 'winter',
        'water_requirement': 'medium',
        'yield_potential': 'high'
    },
    'rice': {
        'optimal_temp': (20, 35),
        'optimal_humidity': (70, 90),
        'optimal_moisture': (80, 100),
        'optimal_ph': (5.5, 7.0),
        'season': 'monsoon',
        'water_requirement': 'high',
        'yield_potential': 'very_high'
    },
    'tomato': {
        'optimal_temp': (18, 30),
        'optimal_humidity': (50, 80),
        'optimal_moisture': (60, 85),
        'optimal_ph': (6.0, 6.8),
        'season': 'all_season',
        'water_requirement': 'medium',
        'yield_potential': 'high'
    },
    'potato': {
        'optimal_temp': (15, 25),
        'optimal_humidity': (60, 80),
        'optimal_moisture': (70, 90),
        'optimal_ph': (4.8, 5.5),
        'season': 'winter',
        'water_requirement': 'medium',
        'yield_potential': 'high'
    },
    'corn': {
        'optimal_temp': (20, 30),
        'optimal_humidity': (50, 70),
        'optimal_moisture': (60, 80),
        'optimal_ph': (6.0, 7.0),
        'season': 'summer',
        'water_requirement': 'medium',
        'yield_potential': 'very_high'
    },
    'cotton': {
        'optimal_temp': (25, 35),
        'optimal_humidity': (40, 60),
        'optimal_moisture': (50, 70),
        'optimal_ph': (5.8, 8.0),
        'season': 'summer',
        'water_requirement': 'low',
        'yield_potential': 'medium'
    },
    'sugarcane': {
        'optimal_temp': (25, 35),
        'optimal_humidity': (60, 80),
        'optimal_moisture': (70, 90),
        'optimal_ph': (6.0, 7.5),
        'season': 'all_season',
        'water_requirement': 'high',
        'yield_potential': 'very_high'
    }
}

def calculate_crop_suitability(current_conditions, crop_name):
    """Calculate suitability score for a specific crop based on current conditions"""
    if crop_name not in CROP_DATABASE:
        return 0
    
    crop = CROP_DATABASE[crop_name]
    temp, humidity, moisture, ph = current_conditions
    
    # Temperature suitability (0-100)
    temp_min, temp_max = crop['optimal_temp']
    if temp_min <= temp <= temp_max:
        temp_score = 100
    else:
        temp_diff = min(abs(temp - temp_min), abs(temp - temp_max))
        temp_score = max(0, 100 - (temp_diff * 5))
    
    # Humidity suitability (0-100)
    hum_min, hum_max = crop['optimal_humidity']
    if hum_min <= humidity <= hum_max:
        hum_score = 100
    else:
        hum_diff = min(abs(humidity - hum_min), abs(humidity - hum_max))
        hum_score = max(0, 100 - (hum_diff * 2))
    
    # Moisture suitability (0-100)
    moist_min, moist_max = crop['optimal_moisture']
    if moist_min <= moisture <= moist_max:
        moist_score = 100
    else:
        moist_diff = min(abs(moisture - moist_min), abs(moisture - moist_max))
        moist_score = max(0, 100 - (moist_diff * 2))
    
    # pH suitability (0-100)
    ph_min, ph_max = crop['optimal_ph']
    if ph_min <= ph <= ph_max:
        ph_score = 100
    else:
        ph_diff = min(abs(ph - ph_min), abs(ph - ph_max))
        ph_score = max(0, 100 - (ph_diff * 20))
    
    # Weighted average
    overall_score = (temp_score * 0.3 + hum_score * 0.2 + moist_score * 0.3 + ph_score * 0.2)
    return round(overall_score, 2)

def get_ai_crop_recommendations(current_conditions):
    """Get AI-powered crop recommendations based on current sensor data"""
    temp, humidity, moisture, ph = current_conditions
    
    recommendations = []
    
    for crop_name in CROP_DATABASE.keys():
        suitability_score = calculate_crop_suitability(current_conditions, crop_name)
        crop_info = CROP_DATABASE[crop_name]
        
        # Additional factors
        season_factor = 1.0  # Could be enhanced with actual season detection
        water_availability = "high" if moisture > 70 else "medium" if moisture > 50 else "low"
        
        # Adjust score based on water requirements
        if crop_info['water_requirement'] == 'high' and water_availability == 'low':
            suitability_score *= 0.7
        elif crop_info['water_requirement'] == 'low' and water_availability == 'high':
            suitability_score *= 1.1
        
        recommendations.append({
            'crop': crop_name.title(),
            'suitability_score': suitability_score,
            'optimal_conditions': {
                'temperature': f"{crop_info['optimal_temp'][0]}-{crop_info['optimal_temp'][1]}°C",
                'humidity': f"{crop_info['optimal_humidity'][0]}-{crop_info['optimal_humidity'][1]}%",
                'moisture': f"{crop_info['optimal_moisture'][0]}-{crop_info['optimal_moisture'][1]}%",
                'ph': f"{crop_info['optimal_ph'][0]}-{crop_info['optimal_ph'][1]}"
            },
            'water_requirement': crop_info['water_requirement'],
            'yield_potential': crop_info['yield_potential'],
            'season': crop_info['season']
        })
    
    # Sort by suitability score
    recommendations.sort(key=lambda x: x['suitability_score'], reverse=True)
    return recommendations

def analyze_soil_health(current_conditions):
    """Analyze overall soil health and provide recommendations"""
    temp, humidity, moisture, ph = current_conditions
    
    health_score = 0
    recommendations = []
    
    # Temperature analysis
    if 15 <= temp <= 35:
        health_score += 25
        temp_status = "✅ Optimal"
    elif temp < 10 or temp > 40:
        health_score += 5
        temp_status = "❌ Extreme - Consider shade/irrigation"
        recommendations.append("Extreme temperature detected. Consider providing shade or irrigation.")
    else:
        health_score += 15
        temp_status = "⚠️ Suboptimal"
    
    # Humidity analysis
    if 40 <= humidity <= 80:
        health_score += 25
        hum_status = "✅ Optimal"
    elif humidity < 30:
        health_score += 10
        hum_status = "⚠️ Low humidity"
        recommendations.append("Low humidity detected. Consider misting or irrigation.")
    else:
        health_score += 15
        hum_status = "⚠️ High humidity"
    
    # Moisture analysis
    if 50 <= moisture <= 80:
        health_score += 25
        moist_status = "✅ Optimal"
    elif moisture < 30:
        health_score += 5
        moist_status = "❌ Critical - Irrigation needed"
        recommendations.append("Critical soil moisture level. Immediate irrigation required.")
    elif moisture > 90:
        health_score += 10
        moist_status = "⚠️ Waterlogged"
        recommendations.append("Soil may be waterlogged. Check drainage.")
    else:
        health_score += 15
        moist_status = "⚠️ Suboptimal"
    
    # pH analysis
    if 6.0 <= ph <= 7.5:
        health_score += 25
        ph_status = "✅ Optimal"
    elif ph < 5.5 or ph > 8.0:
        health_score += 5
        ph_status = "❌ Extreme pH"
        if ph < 5.5:
            recommendations.append("Soil is too acidic. Consider adding lime.")
        else:
            recommendations.append("Soil is too alkaline. Consider adding sulfur or organic matter.")
else:
        health_score += 15
        ph_status = "⚠️ Suboptimal"
    
    return {
        'overall_score': health_score,
        'conditions': {
            'temperature': {'value': f"{temp}°C", 'status': temp_status},
            'humidity': {'value': f"{humidity}%", 'status': hum_status},
            'moisture': {'value': f"{moisture}%", 'status': moist_status},
            'ph': {'value': f"{ph}", 'status': ph_status}
        },
        'recommendations': recommendations
    }

# ---- Local API (Flask) ----
app = Flask(__name__)
CORS(app)

def compute_ai_from_latest():
    data = fetch_current_sensor_data()
    # If realtime missing, try local CSV dataset
    if not data or not all(k in data for k in ['temperature','humidity','moisture','ph']):
        df = load_local_history_csv()
        if df is None or df.empty:
            return None
        last = df.iloc[-1]
        current_conditions = (
            float(last['temperature']),
            float(last['humidity']),
            float(last['moisture']),
            float(last['ph'])
        )
    else:
        current_conditions = (
            float(data['temperature']),
            float(data['humidity']),
            float(data['moisture']),
            float(data['ph'])
        )
    soil_analysis = analyze_soil_health(current_conditions)
    recommendations = get_ai_crop_recommendations(current_conditions)
    payload = {
        'timestamp': datetime.now().isoformat(),
        'current_conditions': {
            'temperature': current_conditions[0],
            'humidity': current_conditions[1],
            'moisture': current_conditions[2],
            'ph': current_conditions[3]
        },
        'soil_health': soil_analysis,
        'crop_recommendations': recommendations[:5]
    }
    return payload

@app.get('/api/health')
def api_health():
    return jsonify({'status': 'ok'}), 200

@app.get('/api/ai')
def api_ai():
    result = compute_ai_from_latest()
    if result is None:
        return jsonify({'error': 'No sensor data available'}), 404
    return jsonify(result), 200

@app.get('/api/history')
def api_history():
    # Try Firebase history first
    try:
        hist = db.reference('history').get() or {}
        if hist:
            # Convert to sorted list
            items = []
            for ts, row in hist.items():
                items.append({
                    'timestamp': ts,
                    'temperature': row.get('temperature'),
                    'humidity': row.get('humidity'),
                    'moisture': row.get('moisture'),
                    'ph': row.get('ph')
                })
            items.sort(key=lambda x: x['timestamp'])
            return jsonify({'source': 'firebase', 'rows': items}), 200
    except Exception:
        pass

    # Fallback to local CSV
    df = load_local_history_csv()
    if df is None or df.empty:
        return jsonify({'error': 'No history available'}), 404
    rows = df[['timestamp','temperature','humidity','moisture','ph']].copy()
    rows['timestamp'] = rows['timestamp'].astype(str)
    return jsonify({'source': 'local_csv', 'rows': rows.to_dict(orient='records')}), 200


if __name__ == '__main__':
    # Run local API on localhost:5000
    app.run(host='127.0.0.1', port=5000, debug=False)
