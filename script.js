// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjieZdey8q2UxX3wzK033TrNKlzUQzQpU",
  authDomain: "cropmonitor-a98b8.firebaseapp.com",
  projectId: "cropmonitor-a98b8",
  storageBucket: "cropmonitor-a98b8.firebasestorage.app",
  messagingSenderId: "536073128489",
  appId: "1:536073128489:web:6fb9c5b61db4308c5b6a38"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM Elements
const tempEl = document.getElementById('temp');
const humEl = document.getElementById('hum');
const moistEl = document.getElementById('moist');
const phEl = document.getElementById('ph');
const alertEl = document.getElementById('alert');
const connectionStatus = document.getElementById('connectionStatus');
const lastUpdated = document.getElementById('lastUpdated');

// Status elements for enhanced UI
const tempStatus = document.getElementById('tempStatus');
const humStatus = document.getElementById('humStatus');
const moistStatus = document.getElementById('moistStatus');
const phStatus = document.getElementById('phStatus');

let labels = [];
let temps = [], hums = [], mois = [], phs = [];

const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels,
    datasets: [
      { label: 'Temperature (°C)', data: temps, borderColor: 'red', fill: false },
      { label: 'Humidity (%)', data: hums, borderColor: 'blue', fill: false },
      { label: 'Soil Moisture (%)', data: mois, borderColor: 'green', fill: false },
      { label: 'pH', data: phs, borderColor: 'orange', fill: false }
    ]
  },
  options: {
    scales: { y: { beginAtZero: true } }
  }
});

// Real-time Listener with Enhanced UI
db.ref("SensorData").on("value", snap => {
  const d = snap.val();
  if (!d) return;
  
  // Update connection status
  updateConnectionStatus(true);
  
  // Update sensor values
  tempEl.textContent = d.temperature + " °C";
  humEl.textContent = d.humidity + " %";
  moistEl.textContent = d.moisture + " %";
  phEl.textContent = d.ph;
  
  // Update sensor status indicators
  const tempStatusData = updateSensorStatus(d.temperature, 'temperature');
  tempStatus.textContent = tempStatusData.status;
  tempStatus.className = `sensor-status ${tempStatusData.statusClass}`;
  
  const humStatusData = updateSensorStatus(d.humidity, 'humidity');
  humStatus.textContent = humStatusData.status;
  humStatus.className = `sensor-status ${humStatusData.statusClass}`;
  
  const moistStatusData = updateSensorStatus(d.moisture, 'moisture');
  moistStatus.textContent = moistStatusData.status;
  moistStatus.className = `sensor-status ${moistStatusData.statusClass}`;
  
  const phStatusData = updateSensorStatus(d.ph, 'ph');
  phStatus.textContent = phStatusData.status;
  phStatus.className = `sensor-status ${phStatusData.statusClass}`;

  // Update chart data
  const t = new Date().toLocaleTimeString();
  labels.push(t);
  temps.push(d.temperature);
  hums.push(d.humidity);
  mois.push(d.moisture);
  phs.push(d.ph);

  if (labels.length > 20) {
    labels.shift(); temps.shift(); hums.shift(); mois.shift(); phs.shift();
  }
  chart.update();

  // Enhanced alerts with better styling
  let alertMessage = '';
  let alertType = '';
  
  if (d.moisture < 30) {
    alertMessage = "🚨 Critical: Soil too dry! Immediate irrigation required.";
    alertType = 'error';
  } else if (d.moisture < 40) {
    alertMessage = "⚠️ Warning: Soil moisture low. Consider irrigation.";
    alertType = 'warning';
  } else if (d.moisture > 90) {
    alertMessage = "⚠️ Warning: Soil may be waterlogged. Check drainage.";
    alertType = 'warning';
  } else if (d.ph < 5.5 || d.ph > 8.0) {
    alertMessage = "⚠️ Critical: pH out of optimal range. Soil treatment needed.";
    alertType = 'error';
  } else if (d.ph < 6 || d.ph > 7.5) {
    alertMessage = "⚠️ Warning: pH suboptimal. Consider soil amendments.";
    alertType = 'warning';
  } else if (d.temperature < 10 || d.temperature > 40) {
    alertMessage = "⚠️ Warning: Extreme temperature detected.";
    alertType = 'warning';
  } else {
    alertMessage = "✅ All conditions optimal for crop growth.";
    alertType = 'success';
  }
  
  if (alertMessage) {
    alertEl.textContent = alertMessage;
    alertEl.className = `alert ${alertType} show`;
  } else {
    alertEl.className = 'alert';
  }
  
  // Update last updated time
  updateLastUpdated();
}, error => {
  console.error("Firebase connection error:", error);
  updateConnectionStatus(false);
});

function analyzeCrop() {
  const name = document.getElementById('cropName').value.trim().toLowerCase();
  const date = document.getElementById('plantDate').value;
  const suit = document.getElementById('suitability');
  const growth = document.getElementById('growthStage');
  const irrig = document.getElementById('irrigationAdvice');
  const fert = document.getElementById('fertilizerAdvice');

  if (!name || !date) { alert("Enter crop & date"); return; }

  const today = new Date();
  const start = new Date(date);
  const days = Math.floor((today - start) / (1000 * 3600 * 24));

  // Example conditions
  let suitable = "Good Environment.";
  let stage = "Unknown";
  if (days < 10) stage = "🌱 Germination";
  else if (days < 30) stage = "🌿 Vegetative Growth";
  else if (days < 60) stage = "🌼 Flowering";
  else stage = "🌾 Harvest";

  irrig.textContent = "💧 Water every 2–3 days during vegetative stage.";
  fert.textContent = "🧪 Add compost or organic fertilizer every 15 days.";
  suit.textContent = `✅ Crop "${name}" environment is ${suitable}.`;
  growth.textContent = `📆 Current Stage: ${stage}`;
}

function calculateProfit() {
  const mp = parseFloat(document.getElementById('marketPrice').value);
  const cp = parseFloat(document.getElementById('costPrice').value);
  const y = parseFloat(document.getElementById('yield').value);
  const res = document.getElementById('profitResult');
  if (!mp || !cp || !y) { res.textContent = "Enter all fields."; return; }
  const profit = (mp - cp) * y;
  if (profit > 0) res.textContent = `✅ Profit: ₹${profit.toFixed(2)}`;
  else res.textContent = `⚠️ Loss: ₹${profit.toFixed(2)}. Suggestion: Try value-added product (e.g., dried ${document.getElementById('cropName').value})`;
}

function getAIRecommendations() {
  const recommendationsDiv = document.getElementById('aiRecommendations');
  recommendationsDiv.innerHTML = '<p>🔄 Analyzing sensor data and generating AI recommendations...</p>';
  
  // Try server-side AI first (localhost Flask). If fails, fall back to client-side.
  fetch('http://127.0.0.1:5000/api/ai', { method: 'GET' })
    .then(async (res) => {
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      const recs = data.crop_recommendations || [];
      let html = '<div class="recommendations-container">';
      html += '<h3>🤖 AI-Powered Crop Recommendations (Server)</h3>';
      const cc = data.current_conditions || {};
      html += '<div class="soil-health">';
      html += `<p><strong>Current Conditions:</strong> ${cc.temperature ?? '--'}°C, ${cc.humidity ?? '--'}% humidity, ${cc.moisture ?? '--'}% moisture, pH ${cc.ph ?? '--'}</p>`;
      html += '</div>';
      
      recs.forEach((rec, index) => {
        const score = Math.round(rec.suitability_score || 0);
        let statusClass = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
        let statusIcon = score >= 80 ? '🟢' : score >= 60 ? '🟡' : score >= 40 ? '🟠' : '🔴';
        const opt = rec.optimal_conditions || {};
        html += `<div class="recommendation-card ${statusClass}">`;
        html += `<h4>${index + 1}. ${rec.crop} ${statusIcon} ${score}%</h4>`;
        html += `<p><strong>Water Requirement:</strong> ${rec.water_requirement ?? '-'}</p>`;
        html += `<p><strong>Yield Potential:</strong> ${(rec.yield_potential || '').toString().replace('_',' ')}</p>`;
        html += `<p><strong>Season:</strong> ${rec.season ?? '-'}</p>`;
        html += `<p><strong>Optimal Conditions:</strong> ${opt.temperature ?? '-'}, ${opt.humidity ?? '-'}, ${opt.moisture ?? '-'}, pH ${opt.ph ?? '-'}</p>`;
        html += '</div>';
      });
      html += '</div>';
      recommendationsDiv.innerHTML = html;
    })
    .catch(() => {
      // Get current sensor data from UI and compute locally
      const currentTemp = parseFloat(tempEl.textContent) || 0;
      const currentHum = parseFloat(humEl.textContent) || 0;
      const currentMoist = parseFloat(moistEl.textContent) || 0;
      const currentPh = parseFloat(phEl.textContent) || 0;
      const recommendations = calculateCropRecommendations(currentTemp, currentHum, currentMoist, currentPh);
      let html = '<div class="recommendations-container">';
      html += '<h3>🤖 AI-Powered Crop Recommendations</h3>';
      html += '<div class="soil-health">';
      html += `<p><strong>Current Conditions:</strong> ${currentTemp}°C, ${currentHum}% humidity, ${currentMoist}% moisture, pH ${currentPh}</p>`;
      html += '</div>';
      recommendations.forEach((rec, index) => {
        const score = rec.score;
        let statusClass = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
        let statusIcon = score >= 80 ? '🟢' : score >= 60 ? '🟡' : score >= 40 ? '🟠' : '🔴';
        html += `<div class="recommendation-card ${statusClass}">`;
        html += `<h4>${index + 1}. ${rec.crop} ${statusIcon} ${score}%</h4>`;
        html += `<p><strong>Water Requirement:</strong> ${rec.waterRequirement}</p>`;
        html += `<p><strong>Yield Potential:</strong> ${rec.yieldPotential}</p>`;
        html += `<p><strong>Season:</strong> ${rec.season}</p>`;
        html += `<p><strong>Optimal Conditions:</strong> ${rec.optimalConditions}</p>`;
        html += `<p><strong>Why this crop:</strong> ${rec.reason}</p>`;
        html += '</div>';
      });
      html += '</div>';
      recommendationsDiv.innerHTML = html;
    });
}

function calculateCropRecommendations(temp, humidity, moisture, ph) {
  const crops = [
    {
      name: 'Wheat',
      optimalTemp: [15, 25],
      optimalHumidity: [40, 70],
      optimalMoisture: [50, 80],
      optimalPh: [6.0, 7.5],
      waterRequirement: 'Medium',
      yieldPotential: 'High',
      season: 'Winter',
      reason: 'Good for cooler climates and moderate water availability'
    },
    {
      name: 'Rice',
      optimalTemp: [20, 35],
      optimalHumidity: [70, 90],
      optimalMoisture: [80, 100],
      optimalPh: [5.5, 7.0],
      waterRequirement: 'High',
      yieldPotential: 'Very High',
      season: 'Monsoon',
      reason: 'Requires high moisture and humidity'
    },
    {
      name: 'Tomato',
      optimalTemp: [18, 30],
      optimalHumidity: [50, 80],
      optimalMoisture: [60, 85],
      optimalPh: [6.0, 6.8],
      waterRequirement: 'Medium',
      yieldPotential: 'High',
      season: 'All Season',
      reason: 'Versatile crop with good market value'
    },
    {
      name: 'Potato',
      optimalTemp: [15, 25],
      optimalHumidity: [60, 80],
      optimalMoisture: [70, 90],
      optimalPh: [4.8, 5.5],
      waterRequirement: 'Medium',
      yieldPotential: 'High',
      season: 'Winter',
      reason: 'Good for cooler temperatures and moderate moisture'
    },
    {
      name: 'Corn',
      optimalTemp: [20, 30],
      optimalHumidity: [50, 70],
      optimalMoisture: [60, 80],
      optimalPh: [6.0, 7.0],
      waterRequirement: 'Medium',
      yieldPotential: 'Very High',
      season: 'Summer',
      reason: 'High yield potential with moderate requirements'
    },
    {
      name: 'Cotton',
      optimalTemp: [25, 35],
      optimalHumidity: [40, 60],
      optimalMoisture: [50, 70],
      optimalPh: [5.8, 8.0],
      waterRequirement: 'Low',
      yieldPotential: 'Medium',
      season: 'Summer',
      reason: 'Good for hot, dry climates'
    }
  ];
  
  const recommendations = crops.map(crop => {
    // Calculate suitability score
    let tempScore = 100 - Math.abs(temp - (crop.optimalTemp[0] + crop.optimalTemp[1]) / 2) * 2;
    let humScore = 100 - Math.abs(humidity - (crop.optimalHumidity[0] + crop.optimalHumidity[1]) / 2) * 1.5;
    let moistScore = 100 - Math.abs(moisture - (crop.optimalMoisture[0] + crop.optimalMoisture[1]) / 2) * 1.5;
    let phScore = 100 - Math.abs(ph - (crop.optimalPh[0] + crop.optimalPh[1]) / 2) * 15;
    
    // Ensure scores are within 0-100 range
    tempScore = Math.max(0, Math.min(100, tempScore));
    humScore = Math.max(0, Math.min(100, humScore));
    moistScore = Math.max(0, Math.min(100, moistScore));
    phScore = Math.max(0, Math.min(100, phScore));
    
    // Weighted average
    const overallScore = Math.round((tempScore * 0.3 + humScore * 0.2 + moistScore * 0.3 + phScore * 0.2));
    
    return {
      crop: crop.name,
      score: overallScore,
      waterRequirement: crop.waterRequirement,
      yieldPotential: crop.yieldPotential,
      season: crop.season,
      optimalConditions: `${crop.optimalTemp[0]}-${crop.optimalTemp[1]}°C, ${crop.optimalHumidity[0]}-${crop.optimalHumidity[1]}% humidity, ${crop.optimalMoisture[0]}-${crop.optimalMoisture[1]}% moisture, pH ${crop.optimalPh[0]}-${crop.optimalPh[1]}`,
      reason: crop.reason
    };
  });
  
  // Sort by score (highest first)
  return recommendations.sort((a, b) => b.score - a.score);
}

// Enhanced UI Functions
function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
    connectionStatus.className = 'status-indicator connected';
  } else {
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
    connectionStatus.className = 'status-indicator';
  }
}

function updateLastUpdated() {
  const now = new Date();
  lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

function updateSensorStatus(value, type) {
  let status = '';
  let statusClass = '';
  
  switch(type) {
    case 'temperature':
      if (value >= 15 && value <= 35) {
        status = 'Optimal';
        statusClass = 'optimal';
      } else if (value < 10 || value > 40) {
        status = 'Critical';
        statusClass = 'critical';
      } else {
        status = 'Warning';
        statusClass = 'warning';
      }
      break;
    case 'humidity':
      if (value >= 40 && value <= 80) {
        status = 'Optimal';
        statusClass = 'optimal';
      } else if (value < 30 || value > 90) {
        status = 'Critical';
        statusClass = 'critical';
      } else {
        status = 'Warning';
        statusClass = 'warning';
      }
      break;
    case 'moisture':
      if (value >= 50 && value <= 80) {
        status = 'Optimal';
        statusClass = 'optimal';
      } else if (value < 30) {
        status = 'Critical';
        statusClass = 'critical';
      } else if (value > 90) {
        status = 'Waterlogged';
        statusClass = 'critical';
      } else {
        status = 'Warning';
        statusClass = 'warning';
      }
      break;
    case 'ph':
      if (value >= 6.0 && value <= 7.5) {
        status = 'Optimal';
        statusClass = 'optimal';
      } else if (value < 5.5 || value > 8.0) {
        status = 'Critical';
        statusClass = 'critical';
      } else {
        status = 'Warning';
        statusClass = 'warning';
      }
      break;
  }
  
  return { status, statusClass };
}

function refreshData() {
  // Add loading animation
  const refreshBtn = document.querySelector('.btn-secondary');
  const originalText = refreshBtn.innerHTML;
  refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
  refreshBtn.disabled = true;
  
  // Simulate refresh delay
  setTimeout(() => {
    refreshBtn.innerHTML = originalText;
    refreshBtn.disabled = false;
    updateLastUpdated();
  }, 1000);
}

function openProfitCalculator() {
  // Create modal for profit calculator
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fas fa-calculator"></i> Profit Calculator</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Market Price (₹/kg)</label>
          <input type="number" id="modalMarketPrice" placeholder="Enter market price">
        </div>
        <div class="form-group">
          <label>Your Cost (₹/kg)</label>
          <input type="number" id="modalCostPrice" placeholder="Enter your cost">
        </div>
        <div class="form-group">
          <label>Expected Yield (kg)</label>
          <input type="number" id="modalYield" placeholder="Enter expected yield">
        </div>
        <button class="btn-primary" onclick="calculateModalProfit()">
          <i class="fas fa-calculator"></i> Calculate Profit
        </button>
        <div id="modalProfitResult" class="profit-result"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function calculateModalProfit() {
  const mp = parseFloat(document.getElementById('modalMarketPrice').value);
  const cp = parseFloat(document.getElementById('modalCostPrice').value);
  const y = parseFloat(document.getElementById('modalYield').value);
  const res = document.getElementById('modalProfitResult');
  
  if (!mp || !cp || !y) {
    res.innerHTML = '<div class="alert error">Please enter all fields.</div>';
    return;
  }
  
  const profit = (mp - cp) * y;
  const profitMargin = ((mp - cp) / cp) * 100;
  
  if (profit > 0) {
    res.innerHTML = `
      <div class="profit-success">
        <h4><i class="fas fa-check-circle"></i> Profit Analysis</h4>
        <p><strong>Total Profit:</strong> ₹${profit.toFixed(2)}</p>
        <p><strong>Profit Margin:</strong> ${profitMargin.toFixed(1)}%</p>
        <p><strong>ROI:</strong> ${((profit / (cp * y)) * 100).toFixed(1)}%</p>
      </div>
    `;
  } else {
    res.innerHTML = `
      <div class="profit-warning">
        <h4><i class="fas fa-exclamation-triangle"></i> Loss Analysis</h4>
        <p><strong>Total Loss:</strong> ₹${Math.abs(profit).toFixed(2)}</p>
        <p><strong>Loss Margin:</strong> ${Math.abs(profitMargin).toFixed(1)}%</p>
        <p><strong>Recommendation:</strong> Consider value-added products or different crops</p>
      </div>
    `;
  }
}

function openCropCalendar() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fas fa-calendar-alt"></i> Crop Calendar</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="calendar-info">
          <h4>Recommended Planting Schedule</h4>
          <div class="calendar-grid">
            <div class="calendar-month">
              <h5>January</h5>
              <p>Wheat, Barley, Mustard</p>
            </div>
            <div class="calendar-month">
              <h5>February</h5>
              <p>Tomato, Onion, Potato</p>
            </div>
            <div class="calendar-month">
              <h5>March</h5>
              <p>Rice, Maize, Cotton</p>
            </div>
            <div class="calendar-month">
              <h5>April</h5>
              <p>Rice, Sugarcane, Vegetables</p>
            </div>
            <div class="calendar-month">
              <h5>May</h5>
              <p>Rice, Maize, Cotton</p>
            </div>
            <div class="calendar-month">
              <h5>June</h5>
              <p>Rice, Sugarcane, Vegetables</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function exportHistory() {
  db.ref("history").once("value", snap => {
    const data = snap.val();
    if (!data) return alert("No history data");
    let csv = "timestamp,temperature,humidity,moisture,ph\n";
    for (let t in data) {
      let d = data[t];
      csv += `${t},${d.temperature},${d.humidity},${d.moisture},${d.ph}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "history_export.csv";
    a.click();
  });
}
