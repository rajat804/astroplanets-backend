const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// ✅ Correct API Base URL
const API_BASE = 'https://json.astrologyapi.com/v1';
const ACCESS_TOKEN = process.env.ASTRO_ACCESS_TOKEN;

console.log('=================================');
console.log('🔥 AstrologyAPI Configuration');
console.log('Access Token:', ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
console.log('Base URL :', API_BASE);
console.log('=================================');

const getHeaders = () => {
  if (!ACCESS_TOKEN) return null;
  return {
    'x-astrologyapi-key': ACCESS_TOKEN,
    'Content-Type': 'application/json'
  };
};

// Helper function to get zodiac from degree
const getZodiacFromDegree = (degree) => {
  if (!degree && degree !== 0) return 'N/A';
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs[Math.floor(degree / 30) % 12];
};

// Helper function to get lord from sign
const getLordFromSign = (sign) => {
  const lordMap = {
    'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury',
    'Cancer': 'Moon', 'Leo': 'Sun', 'Virgo': 'Mercury',
    'Libra': 'Venus', 'Scorpio': 'Mars', 'Sagittarius': 'Jupiter',
    'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter'
  };
  return lordMap[sign] || 'N/A';
};

// Calculate houses from ascendant
const getHousesFromAscendant = (ascendant) => {
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  let startIndex = zodiacSigns.findIndex(s => s.toLowerCase() === ascendant.toLowerCase());
  if (startIndex === -1) startIndex = 0;
  
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const signIndex = (startIndex + i) % 12;
    houses.push({
      number: i + 1,
      sign: zodiacSigns[signIndex],
      degree: `${i * 30}° - ${(i + 1) * 30}°`,
      lord: getLordFromSign(zodiacSigns[signIndex])
    });
  }
  return houses;
};

// Calculate planets positions based on date (approximate for demo)
const getPlanetsFromDate = (year, month, date) => {
  const planets = {};
  const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const planetNames = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  // Calculate approximate day of year
  const dayOfYear = Math.floor((new Date(year, month - 1, date) - new Date(year, 0, 0)) / 86400000);
  
  // Approximate planet longitudes
  const longitudes = {
    sun: (dayOfYear * 0.9856) % 360,
    moon: (dayOfYear * 13.176) % 360,
    mars: ((dayOfYear * 0.524) % 360) + 120,
    mercury: ((dayOfYear * 1.234) % 360) + 80,
    jupiter: ((dayOfYear * 0.083) % 360) + 240,
    venus: ((dayOfYear * 1.602) % 360) + 45,
    saturn: ((dayOfYear * 0.033) % 360) + 180,
    rahu: ((dayOfYear * 0.052) % 360) + 300,
    ketu: ((dayOfYear * 0.052) % 360) + 120
  };
  
  for (const planet of planetList) {
    const longitude = longitudes[planet];
    const signIndex = Math.floor(longitude / 30) % 12;
    planets[planet] = {
      name: planetNames[planet],
      sign: zodiacSigns[signIndex],
      degree: Math.floor(longitude),
      house: signIndex + 1,
      retrograde: planet === 'saturn' || planet === 'rahu' || planet === 'ketu'
    };
  }
  
  return planets;
};

// Calculate Dasha based on Moon's nakshatra
const getDashaFromNakshatra = (nakshatra) => {
  const nakshatraDashaMap = {
    'Ashwini': 'Ketu', 'Bharani': 'Venus', 'Krittika': 'Sun',
    'Rohini': 'Moon', 'Mrigashira': 'Mars', 'Ardra': 'Rahu',
    'Punarvasu': 'Jupiter', 'Pushya': 'Saturn', 'Ashlesha': 'Mercury',
    'Magha': 'Ketu', 'Purva Phalguni': 'Venus', 'Uttara Phalguni': 'Sun',
    'Hasta': 'Moon', 'Chitra': 'Mars', 'Swati': 'Rahu',
    'Vishakha': 'Jupiter', 'Anuradha': 'Saturn', 'Jyeshtha': 'Mercury',
    'Mula': 'Ketu', 'Purva Ashadha': 'Venus', 'Uttara Ashadha': 'Sun',
    'Shravana': 'Moon', 'Dhanishtha': 'Mars', 'Shatabhisha': 'Rahu',
    'Purva Bhadrapada': 'Jupiter', 'Uttara Bhadrapada': 'Saturn', 'Revati': 'Mercury'
  };
  
  const dashaOrder = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const dashaYears = [7, 20, 6, 10, 7, 18, 16, 19, 17];
  
  const mahaDasha = nakshatraDashaMap[nakshatra] || 'Venus';
  const currentIndex = dashaOrder.indexOf(mahaDasha);
  const antarDasha = dashaOrder[(currentIndex + 1) % 9] || 'Sun';
  
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + dashaYears[currentIndex]);
  
  return {
    maha_dasha: mahaDasha,
    antar_dasha: antarDasha,
    end_date: endDate.toISOString().split('T')[0]
  };
};

// ================== GENERATE KUNDLI & PANCHANG ==================
router.post('/generate', async (req, res) => {
  try {
    const { date, month, year, hour, minute, latitude, longitude, timezone = 5.5 } = req.body;

    console.log('📥 Received:', { date, month, year, hour, minute, latitude, longitude });

    // Validation
    if (!date || !month || !year || hour === undefined || minute === undefined || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const requestBody = {
      day: parseInt(date),
      month: parseInt(month),
      year: parseInt(year),
      hour: parseInt(hour),
      min: parseInt(minute),
      lat: parseFloat(latitude),
      lon: parseFloat(longitude),
      tzone: parseFloat(timezone),
      ayanamsha: 'lahiri'
    };

    console.log('📤 Request to AstrologyAPI:', JSON.stringify(requestBody, null, 2));

    const headers = getHeaders();

    if (!headers) {
      return res.status(401).json({
        success: false,
        message: 'Astrology API Access Token missing in .env file'
      });
    }

    // ✅ Call both APIs
    const [kundliResponse, panchangResponse] = await Promise.all([
      axios.post(`${API_BASE}/astro_details`, requestBody, {
        headers: headers,
        timeout: 30000
      }),
      axios.post(`${API_BASE}/basic_panchang`, requestBody, {
        headers: headers,
        timeout: 30000
      })
    ]);

    console.log('✅ Both APIs responded successfully');
    
    const kundliRaw = kundliResponse.data;
    const panchangRaw = panchangResponse.data;
    
    console.log('📊 Kundli Response:', JSON.stringify(kundliRaw, null, 2));

    // ✅ Extract data from response
    const ascendant = kundliRaw.ascendant || 'N/A';
    const ascendantLord = kundliRaw.ascendant_lord || getLordFromSign(ascendant);
    const sign = kundliRaw.sign || 'N/A';
    const nakshatra = kundliRaw.Naksahtra || kundliRaw.nakshatra || 'N/A';
    const nakshatraLord = kundliRaw.NaksahtraLord || 'N/A';
    const nakshatraPada = kundliRaw.Charan || 'N/A';
    
    // ✅ Generate houses from ascendant
    const houses = getHousesFromAscendant(ascendant);
    
    // ✅ Generate planets from date
    const planets = getPlanetsFromDate(year, month, date);
    
    // ✅ Calculate Dasha from nakshatra
    const dasha = getDashaFromNakshatra(nakshatra);
    
    // ✅ Vedic details from response
    const yoga = kundliRaw.Yog || 'N/A';
    const tithi = kundliRaw.Tithi || 'N/A';
    const karana = kundliRaw.Karan || 'N/A';
    const gan = kundliRaw.Gan || 'N/A';
    const nadi = kundliRaw.Nadi || 'N/A';
    const varna = kundliRaw.Varna || 'N/A';
    const vashya = kundliRaw.Vashya || 'N/A';
    const yoni = kundliRaw.Yoni || 'N/A';
    const signLord = kundliRaw.SignLord || getLordFromSign(sign);
    const tatva = kundliRaw.tatva || 'N/A';
    const paya = kundliRaw.paya || 'N/A';
    const nameAlphabet = kundliRaw.name_alphabet || 'N/A';
    const manglik = 'No'; // Calculate based on Mars position if needed
    
    // ✅ Panchang data
    const sunrise = panchangRaw.sunrise || 'N/A';
    const sunset = panchangRaw.sunset || 'N/A';
    const moonrise = panchangRaw.moonrise || 'N/A';
    const panchangTithi = panchangRaw.tithi || 'N/A';
    const panchangNakshatra = panchangRaw.nakshatra || 'N/A';
    const panchangYoga = panchangRaw.yog || 'N/A';
    const panchangKarana = panchangRaw.karan || 'N/A';
    
    // ✅ Merge final response
    const mergedKundli = {
      ascendant_sign: ascendant,
      ascendant_lord: ascendantLord,
      sign: sign,
      rashi: sign,
      sign_lord: signLord,
      nakshatra: nakshatra,
      nakshatra_lord: nakshatraLord,
      nakshatra_pada: nakshatraPada,
      manglik: manglik,
      yoga: yoga,
      tithi: tithi,
      karana: karana,
      gan: gan,
      nadi: nadi,
      varna: varna,
      vashya: vashya,
      yoni: yoni,
      tatva: tatva,
      paya: paya,
      name_alphabet: nameAlphabet,
      planets: planets,
      houses: houses,
      dasha: dasha
    };
    
    const mergedPanchang = {
      sunrise: sunrise,
      sunset: sunset,
      moonrise: moonrise,
      tithi: panchangTithi,
      nakshatra: panchangNakshatra,
      yog: panchangYoga,
      karan: panchangKarana,
      paksha: panchangTithi?.split('-')[0] || 'N/A',
      ritu: 'N/A',
      ayana: 'N/A'
    };

    console.log('✅ Final Kundli - Houses:', mergedKundli.houses.length);
    console.log('✅ Final Kundli - Dasha:', mergedKundli.dasha);
    console.log('✅ Final Kundli - Planets:', Object.keys(mergedKundli.planets).length);

    return res.json({
      success: true,
      kundli: mergedKundli,
      panchang: mergedPanchang
    });

  } catch (apiError) {
    console.error("=== ASTROLOGY API ERROR ===");
    console.error("Status:", apiError.response?.status);
    console.error("Response:", JSON.stringify(apiError.response?.data, null, 2));
    console.error("Message:", apiError.message);
    
    if (apiError.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Access Token. Please check your Access Token.'
      });
    }

    return res.status(502).json({
      success: false,
      message: apiError.response?.data?.message || 'Failed to connect to Astrology API',
      details: apiError.response?.data
    });
  }
});

// ✅ Ek baar chalao, phir hata dena - Sirf old charts ko fix karne ke liye
router.post('/fix-old-charts', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let fixed = 0;
    
    for (let i = 0; i < user.savedCharts.length; i++) {
      if (!user.savedCharts[i].isPaid) {
        user.savedCharts[i].isPaid = true;
        fixed++;
      }
    }
    
    await user.save();
    res.json({ success: true, message: `Fixed ${fixed} charts`, total: user.savedCharts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================== DOWNLOAD PDF (With Panchang) ==================
router.post('/download-pdf', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, userDetails } = req.body;
    
    console.log('📥 Generating PDF for user:', req.user._id);
    
    // Helper function to get values safely
    const getValue = (obj, key, defaultValue = 'N/A') => {
      if (!obj) return defaultValue;
      const value = obj[key];
      return (value !== undefined && value !== null && value !== '') ? value : defaultValue;
    };
    
    // ========== Extract Kundli Data ==========
    const kundli = kundliData || {};
    const panchang = panchangData || {};
    
    // Basic Details
    const ascendant = getValue(kundli, 'ascendant_sign') || getValue(kundli, 'lagna') || 'Gemini';
    const ascendantLord = getValue(kundli, 'ascendant_lord') || getValue(kundli, 'lagna_lord') || 'Mercury';
    const rashi = getValue(kundli, 'rashi') || getValue(kundli, 'sign') || 'Libra';
    const nakshatra = getValue(kundli, 'nakshatra') || 'Chitra';
    const nakshatraLord = getValue(kundli, 'nakshatra_lord') || 'Mars';
    const nakshatraPada = getValue(kundli, 'nakshatra_pada') || 3;
    const manglik = getValue(kundli, 'manglik') || 'No';
    
    // Vedic Details
    const yoga = getValue(kundli, 'yoga') || 'Ayushman';
    const tithi = getValue(kundli, 'tithi') || 'Krishna Trayodashi';
    const karana = getValue(kundli, 'karana') || 'Gara';
    const gan = getValue(kundli, 'gan') || 'Rakshasa';
    const nadi = getValue(kundli, 'nadi') || 'Madhya';
    const varna = getValue(kundli, 'varna') || 'Shoodra';
    const vashya = getValue(kundli, 'vashya') || 'Maanav';
    const yoni = getValue(kundli, 'yoni') || 'Vyaaghra';
    const signLord = getValue(kundli, 'sign_lord') || 'Venus';
    const tatva = getValue(kundli, 'tatva') || 'Air';
    const paya = getValue(kundli, 'paya') || 'Silver';
    const nameAlphabet = getValue(kundli, 'name_alphabet') || 'Ra';
    
    // Dasha
    const dasha = kundli.dasha || {};
    const mahaDasha = getValue(dasha, 'maha_dasha') || 'Mars';
    const antarDasha = getValue(dasha, 'antar_dasha') || 'Rahu';
    const dashaEndDate = getValue(dasha, 'end_date') || '2033-06-11';
    
    // Panchang
    const sunrise = getValue(panchang, 'sunrise') || '06:47:54';
    const sunset = getValue(panchang, 'sunset') || '17:25:35';
    const moonrise = getValue(panchang, 'moonrise') || 'N/A';
    const panchangTithi = getValue(panchang, 'tithi') || 'Krishna Trayodashi';
    const panchangNakshatra = getValue(panchang, 'nakshatra') || 'Chitra';
    const panchangYoga = getValue(panchang, 'yog') || 'Ayushman';
    const panchangKarana = getValue(panchang, 'karan') || 'Gara';
    
    // Birth Details
    const birth = userDetails?.birthDetails || {};
    const birthDate = birth.date ? `${birth.date}/${birth.month}/${birth.year}` : 'N/A';
    const birthTime = birth.hour ? `${birth.hour}:${birth.minute}` : 'N/A';
    
    // ========== Generate Planets Table HTML ==========
    let planetsTableHtml = '';
    const planets = kundli.planets || {};
    const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
    const planetNames = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
    
    for (const planet of planetList) {
      const pData = planets[planet] || {};
      planetsTableHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">${planetNames[planet]}</td>
          <td style="padding: 8px; border: 1px solid #000;">${pData.sign || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #000;">${pData.degree || 'N/A'}°</td>
          <td style="padding: 8px; border: 1px solid #000;">${pData.house || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #000;">${pData.retrograde ? 'Yes' : 'No'}</td>
        </tr>
      `;
    }
    
    // ========== Generate Houses Table HTML ==========
    let housesTableHtml = '';
    const houses = kundli.houses || [];
    for (let i = 0; i < Math.min(12, houses.length); i++) {
      const house = houses[i];
      housesTableHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">House ${house.number || i + 1}</td>
          <td style="padding: 8px; border: 1px solid #000;">${house.sign || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #000;">${house.lord || 'N/A'}</td>
        </tr>
      `;
    }
    
    // ========== Generate Vedic Details Table HTML ==========
    const vedicTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">🧘 Yoga</td>
          <td style="padding: 8px; border: 1px solid #000;">${yoga}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">📖 Tithi</td>
          <td style="padding: 8px; border: 1px solid #000;">${tithi}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">🌊 Karana</td>
          <td style="padding: 8px; border: 1px solid #000;">${karana}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">👨‍👩‍👧 Gan</td>
          <td style="padding: 8px; border: 1px solid #000;">${gan}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">💫 Nadi</td>
          <td style="padding: 8px; border: 1px solid #000;">${nadi}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">🎨 Varna</td>
          <td style="padding: 8px; border: 1px solid #000;">${varna}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">🤝 Vashya</td>
          <td style="padding: 8px; border: 1px solid #000;">${vashya}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">🐘 Yoni</td>
          <td style="padding: 8px; border: 1px solid #000;">${yoni}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">👑 Sign Lord</td>
          <td style="padding: 8px; border: 1px solid #000;">${signLord}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">🌍 Tatva</td>
          <td style="padding: 8px; border: 1px solid #000;">${tatva}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">💰 Paya</td>
          <td style="padding: 8px; border: 1px solid #000;">${paya}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">🔤 Alphabet</td>
          <td style="padding: 8px; border: 1px solid #000;">${nameAlphabet}</td>
        </tr>
      </table>
    `;
    
    // ========== HTML Template (Black & White Professional) ==========
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kundli Report - ${userDetails?.name || 'User'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', 'Segoe UI', Arial, serif;
      padding: 40px;
      background: white;
      color: #000000;
      line-height: 1.4;
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #000000;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }
    .header p {
      font-size: 11px;
      color: #444;
    }
    .user-info {
      background: #f5f5f5;
      padding: 12px 20px;
      margin-bottom: 25px;
      border: 1px solid #ccc;
      text-align: center;
    }
    .user-info h3 {
      font-size: 16px;
      margin-bottom: 8px;
    }
    .user-info p {
      margin: 3px 0;
      font-size: 11px;
    }
    .section {
      margin-bottom: 25px;
      border: 1px solid #000000;
      page-break-inside: avoid;
    }
    .section-title {
      background: #e8e8e8;
      color: #000000;
      padding: 8px 15px;
      font-size: 14px;
      font-weight: bold;
      border-bottom: 1px solid #000000;
      letter-spacing: 1px;
    }
    .section-content {
      padding: 15px;
      background: #ffffff;
    }
    .ascendant-box {
      text-align: center;
      padding: 20px;
      border: 2px solid #000000;
      margin-bottom: 25px;
      background: #fafafa;
    }
    .ascendant-label {
      font-size: 12px;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }
    .ascendant-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
      text-transform: uppercase;
    }
    .ascendant-lord {
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background: #e8e8e8;
      padding: 10px;
      border: 1px solid #000000;
      font-weight: bold;
      text-align: center;
    }
    td {
      padding: 8px;
      border: 1px solid #000000;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #ccc;
    }
    .manglik-yes {
      background: #2c2c2c;
      color: white;
      padding: 12px;
      text-align: center;
      margin-bottom: 20px;
      border: 1px solid #000;
    }
    .manglik-no {
      background: #f5f5f5;
      color: #000;
      padding: 12px;
      text-align: center;
      margin-bottom: 20px;
      border: 1px solid #000;
    }
    .dasha-box {
      background: #f9f9f9;
      padding: 12px;
      border: 1px solid #000;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ccc;
      font-size: 9px;
      color: #666;
    }
    .highlight {
      font-weight: bold;
    }
    @media print {
      body {
        padding: 20px;
      }
      .section {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔮 JYOTISH KUNDLI</h1>
    <p>Vedic Astrology Birth Chart Report</p>
    <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  </div>
  
  <div class="user-info">
    <h3>📋 Birth Details</h3>
    <p><strong>Name:</strong> ${userDetails?.name || 'User'}</p>
    <p><strong>Email:</strong> ${userDetails?.email || 'Not provided'}</p>
    <p><strong>Date of Birth:</strong> ${birthDate}</p>
    <p><strong>Time of Birth:</strong> ${birthTime}</p>
    ${birth.latitude ? `<p><strong>Coordinates:</strong> ${birth.latitude}° N, ${birth.longitude}° E</p>` : ''}
  </div>
  
  <!-- Lagna / Ascendant -->
  <div class="ascendant-box">
    <div class="ascendant-label">🌅 LAGNA (ASCENDANT)</div>
    <div class="ascendant-value">${ascendant}</div>
    <div class="ascendant-lord">Lord: ${ascendantLord}</div>
  </div>
  
  <!-- Rashi & Nakshatra -->
  <div class="section">
    <div class="section-title">⭐ RASHI & NAKSHATRA</div>
    <div class="section-content">
      <table>
        <tr>
          <td style="font-weight: bold; width: 50%;">Rashi (Moon Sign)</td>
          <td>${rashi}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Nakshatra (Birth Star)</td>
          <td>${nakshatra}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Nakshatra Lord</td>
          <td>${nakshatraLord}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Pada / Charan</td>
          <td>${nakshatraPada}</td>
        </tr>
      </table>
    </div>
  </div>
  
  <!-- Manglik Dosha -->
  <div class="${manglik === 'Yes' || manglik === 'Manglik' ? 'manglik-yes' : 'manglik-no'}">
    <strong>🔴 MANGAL DOSHA</strong><br>
    <span style="font-size: 18px; font-weight: bold;">${manglik === 'Yes' || manglik === 'Manglik' ? 'Manglik' : 'Non-Manglik'}</span>
  </div>
  
  <!-- Planetary Positions -->
  <div class="section">
    <div class="section-title">🪐 PLANETARY POSITIONS (GRAHAS)</div>
    <div class="section-content">
      <table>
        <thead>
          <tr>
            <th>Planet</th>
            <th>Sign</th>
            <th>Degree</th>
            <th>House</th>
            <th>Retrograde</th>
          </tr>
        </thead>
        <tbody>
          ${planetsTableHtml}
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- Houses (Bhavas) -->
  <div class="section">
    <div class="section-title">🏠 HOUSES (BHAVAS)</div>
    <div class="section-content">
      <table>
        <thead>
          <tr>
            <th>House</th>
            <th>Sign</th>
            <th>Lord</th>
          </tr>
        </thead>
        <tbody>
          ${housesTableHtml}
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- Vedic Details -->
  <div class="section">
    <div class="section-title">📖 VEDIC ASTROLOGICAL DETAILS</div>
    <div class="section-content">
      ${vedicTableHtml}
    </div>
  </div>
  
  <!-- Current Dasha -->
  <div class="section">
    <div class="section-title">⏳ CURRENT VIMSHOTTARI DASHA</div>
    <div class="section-content">
      <div class="dasha-box">
        <div><strong>Maha Dasha:</strong> ${mahaDasha}</div>
        <div><strong>Antar Dasha:</strong> ${antarDasha}</div>
        <div><strong>Valid Until:</strong> ${dashaEndDate}</div>
      </div>
    </div>
  </div>
  
  <!-- Daily Panchang -->
  <div class="section">
    <div class="section-title">📅 DAILY PANCHANG</div>
    <div class="section-content">
      <table>
        <tr>
          <td style="font-weight: bold; width: 33%;">🌅 Sunrise</td>
          <td>${sunrise}</td>
          <td style="font-weight: bold; width: 33%;">🌇 Sunset</td>
          <td>${sunset}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">🌙 Moonrise</td>
          <td>${moonrise}</td>
          <td style="font-weight: bold;">📖 Tithi</td>
          <td>${panchangTithi}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">⭐ Nakshatra</td>
          <td>${panchangNakshatra}</td>
          <td style="font-weight: bold;">🧘 Yoga</td>
          <td>${panchangYoga}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">🌊 Karana</td>
          <td colspan="3">${panchangKarana}</td>
        </tr>
      </table>
    </div>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated kundli report based on Vedic astrology calculations.</p>
    <p>© ${new Date().getFullYear()} Nakshatra Ganak - All Rights Reserved</p>
    <p>For accurate predictions and remedies, consult an expert astrologer.</p>
  </div>
</body>
</html>`;
    
    // Use html-pdf
    const pdf = require('html-pdf');
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: '10mm',
      type: 'pdf',
      timeout: 60000
    };
    
    pdf.create(htmlContent, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF generation error:', err);
        return res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=kundli_report.pdf');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF: ' + err.message });
  }
});

// ================== SAVE PURCHASED KUNDLI ==================
router.post('/save-purchased-kundli', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, birthDetails } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.savedCharts) {
      user.savedCharts = [];
    }

    user.savedCharts.push({
      birthDetails: {
        date: birthDetails.date,
        month: birthDetails.month,
        year: birthDetails.year,
        hour: birthDetails.hour,
        minute: birthDetails.minute,
        latitude: birthDetails.latitude,
        longitude: birthDetails.longitude,
        timezone: birthDetails.timezone
      },
      kundliData: kundliData,
      panchangData: panchangData,
      purchasedAt: new Date(),
      isPaid: true
    });
    
    await user.save();
    
    res.json({ success: true, message: 'Kundli saved to profile successfully' });
  } catch (err) {
    console.error('Save kundli error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/admin/all-kundlis', async (req, res) => {
  try {
    console.log('🔍 Admin fetching all kundlis from all users...');
    
    // Get all users with their saved charts
    const allUsers = await User.find({}, 'fullName email savedCharts createdAt');
    
    const allKundlis = [];
    
    for (const user of allUsers) {
      if (user.savedCharts && user.savedCharts.length > 0) {
        for (const chart of user.savedCharts) {
          allKundlis.push({
            _id: chart._id,
            userId: user._id,
            userName: user.fullName || user.email,
            userEmail: user.email,
            birthDetails: chart.birthDetails || null,
            kundliData: chart.kundliData || {},
            panchangData: chart.panchangData || {},
            createdAt: chart.createdAt || chart.purchasedAt || user.createdAt,
            purchasedAt: chart.purchasedAt,
            isPaid: chart.isPaid !== false
          });
        }
      }
    }
    
    console.log(`✅ Admin: Returning ${allKundlis.length} kundlis from ${allUsers.length} users`);
    
    res.json({ 
      success: true, 
      kundlis: allKundlis,
      totalUsers: allUsers.length,
      totalKundlis: allKundlis.length
    });
    
  } catch (err) {
    console.error('❌ Admin fetch kundlis error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch kundlis: ' + err.message 
    });
  }
});

// ================== GET PURCHASED KUNDLIS ==================
// ================== GET PURCHASED KUNDLIS (FIXED VERSION) ==================
router.get('/my-purchased-kundlis', protect, async (req, res) => {
  try {
    console.log('🔍 Fetching purchased kundlis for user:', req.user._id);
    
    // First check if user exists
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log('❌ User not found:', req.user._id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Safely get savedCharts
    const allCharts = user.savedCharts || [];
    console.log(`📊 Total charts in DB: ${allCharts.length}`);
    
    // Process charts safely
    const purchasedKundlis = [];
    
    for (let i = 0; i < allCharts.length; i++) {
      const chart = allCharts[i];
      
      // Create a clean copy of the chart data
      const cleanChart = {
        _id: chart._id || `temp_${i}`,
        birthDetails: chart.birthDetails || null,
        kundliData: chart.kundliData || {},
        panchangData: chart.panchangData || {},
        createdAt: chart.createdAt || chart.purchasedAt || new Date(),
        purchasedAt: chart.purchasedAt || chart.createdAt || new Date(),
        isPaid: chart.isPaid !== false
      };
      
      // Ensure kundliData has required fields
      if (!cleanChart.kundliData.lagna && cleanChart.kundliData.ascendant_sign) {
        cleanChart.kundliData.lagna = cleanChart.kundliData.ascendant_sign;
      }
      if (!cleanChart.kundliData.rashi && cleanChart.kundliData.sign) {
        cleanChart.kundliData.rashi = cleanChart.kundliData.sign;
      }
      
      purchasedKundlis.push(cleanChart);
    }
    
    console.log(`✅ Returning ${purchasedKundlis.length} kundlis`);
    
    res.json({ 
      success: true, 
      kundlis: purchasedKundlis,
      totalCharts: allCharts.length,
      count: purchasedKundlis.length
    });
    
  } catch (err) {
    console.error('❌ Error in my-purchased-kundlis:', err);
    console.error('Error stack:', err.stack);
    
    // Send proper error response
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch kundlis: ' + (err.message || 'Internal server error'),
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// ================== SAVE CHART ==================
router.post('/save', protect, async (req, res) => {
  try {
    const { birthDetails, kundliData, panchangData } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.savedCharts = user.savedCharts || [];
    user.savedCharts.push({ birthDetails, kundliData, panchangData, createdAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Chart saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================== GET SAVED CHARTS ==================
router.get('/saved', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, charts: user.savedCharts || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ================== DELETE SAVED CHART ==================
router.delete('/saved/:chartId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.savedCharts = user.savedCharts.filter(c => c._id.toString() !== req.params.chartId);
    await user.save();
    res.json({ success: true, message: 'Chart deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;