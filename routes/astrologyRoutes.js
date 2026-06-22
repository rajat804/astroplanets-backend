const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const pdf = require('html-pdf');

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
router.post('/generate', protect, async (req, res) => {
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


// ================== DOWNLOAD PDF ==================
router.post('/download-pdf', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, userDetails } = req.body;
    
    console.log('📥 Generating PDF for user:', req.user?._id || 'Unknown');
    
    // ✅ Helper function
    const getValue = (obj, key, defaultValue = 'N/A') => {
      if (!obj) return defaultValue;
      const value = obj[key];
      return (value !== undefined && value !== null && value !== '') ? value : defaultValue;
    };
    
    // ✅ User Details
    const userName = userDetails?.name || req.user?.fullName || req.user?.name || 'User';
    const userEmail = userDetails?.email || req.user?.email || 'Not provided';
    
    // ✅ Kundli Data
    const kundli = kundliData || {};
    const panchang = panchangData || {};
    
    // ========== BASIC DETAILS ==========
    const ascendant = getValue(kundli, 'ascendant_sign') || getValue(kundli, 'lagna') || 'N/A';
    const ascendantLord = getValue(kundli, 'ascendant_lord') || getValue(kundli, 'lagna_lord') || 'N/A';
    const rashi = getValue(kundli, 'rashi') || getValue(kundli, 'sign') || 'N/A';
    const signLord = getValue(kundli, 'sign_lord') || 'N/A';
    const nakshatra = getValue(kundli, 'nakshatra') || 'N/A';
    const nakshatraLord = getValue(kundli, 'nakshatra_lord') || 'N/A';
    const nakshatraPada = getValue(kundli, 'nakshatra_pada') || 'N/A';
    const manglik = getValue(kundli, 'manglik') || 'No';
    
    // ========== VEDIC DETAILS ==========
    const yoga = getValue(kundli, 'yoga') || 'N/A';
    const tithi = getValue(kundli, 'tithi') || 'N/A';
    const karana = getValue(kundli, 'karana') || 'N/A';
    const gan = getValue(kundli, 'gan') || 'N/A';
    const nadi = getValue(kundli, 'nadi') || 'N/A';
    const varna = getValue(kundli, 'varna') || 'N/A';
    const vashya = getValue(kundli, 'vashya') || 'N/A';
    const yoni = getValue(kundli, 'yoni') || 'N/A';
    const tatva = getValue(kundli, 'tatva') || 'N/A';
    const paya = getValue(kundli, 'paya') || 'N/A';
    const nameAlphabet = getValue(kundli, 'name_alphabet') || 'N/A';
    
    // ========== DASHA ==========
    const dasha = kundli.dasha || {};
    const mahaDasha = getValue(dasha, 'maha_dasha') || 'N/A';
    const antarDasha = getValue(dasha, 'antar_dasha') || 'N/A';
    const dashaEndDate = getValue(dasha, 'end_date') || 'N/A';
    
    // ========== PANCHANG ==========
    const sunrise = getValue(panchang, 'sunrise') || 'N/A';
    const sunset = getValue(panchang, 'sunset') || 'N/A';
    const moonrise = getValue(panchang, 'moonrise') || 'N/A';
    const panchangTithi = getValue(panchang, 'tithi') || 'N/A';
    const panchangNakshatra = getValue(panchang, 'nakshatra') || 'N/A';
    const panchangYoga = getValue(panchang, 'yog') || 'N/A';
    const panchangKarana = getValue(panchang, 'karan') || 'N/A';
    const paksha = getValue(panchang, 'paksha') || 'N/A';
    
    // ========== BIRTH DETAILS ==========
    const birth = userDetails?.birthDetails || {};
    const birthDate = birth.date && birth.month && birth.year 
      ? `${birth.date}/${birth.month}/${birth.year}` 
      : 'N/A';
    const birthTime = birth.hour && birth.minute 
      ? `${birth.hour}:${birth.minute}` 
      : 'N/A';
    
    // ========== PLANETS TABLE ==========
    let planetsTableHtml = '';
    const planets = kundli.planets || {};
    const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
    const planetNames = { 
      sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', 
      jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', 
      rahu: 'Rahu', ketu: 'Ketu' 
    };
    const planetEmojis = {
      sun: '☀️', moon: '🌙', mars: '♂️', mercury: '☿', 
      jupiter: '♃', venus: '♀️', saturn: '♄', rahu: '☊', ketu: '☋'
    };
    
    for (const planet of planetList) {
      const pData = planets[planet] || {};
      planetsTableHtml += `
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #333; font-weight: bold; font-size: 12px;">${planetEmojis[planet] || ''} ${planetNames[planet]}</td>
          <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${pData.sign || 'N/A'}</td>
          <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${pData.degree || 'N/A'}°</td>
          <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${pData.house || 'N/A'}</td>
          <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${pData.retrograde ? '✅ Yes' : '❌ No'}</td>
        </tr>
      `;
    }
    
    // ========== HOUSES TABLE - FIXED ==========
    let housesTableHtml = '';
    const houses = kundli.houses || [];
    
    if (houses.length > 0) {
      for (let i = 0; i < Math.min(12, houses.length); i++) {
        const house = houses[i] || {};
        // ✅ House number = index + 1 (kyunki number key missing hai)
        const houseNumber = i + 1;
        const houseSign = house.sign || house.name || 'N/A';
        const houseLord = house.lord || house.owner || 'N/A';
        
        housesTableHtml += `
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #333; font-weight: bold; font-size: 12px; text-align: center;">House ${houseNumber}</td>
            <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${houseSign}</td>
            <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${houseLord}</td>
          </tr>
        `;
      }
    } else {
      // ✅ Fallback: Agar houses array empty hai toh default values
      const defaultSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const defaultLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
      
      for (let i = 0; i < 12; i++) {
        housesTableHtml += `
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #333; font-weight: bold; font-size: 12px; text-align: center;">House ${i + 1}</td>
            <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${defaultSigns[i]}</td>
            <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; text-align: center;">${defaultLords[i]}</td>
          </tr>
        `;
      }
    }
    
    // ========== VEDIC DETAILS TABLE ==========
    const vedicKeys = ['yoga', 'tithi', 'karana', 'gan', 'nadi', 'varna', 'vashya', 'yoni', 'tatva', 'paya', 'name_alphabet'];
    const vedicLabels = {
      yoga: '🧘 Yoga',
      tithi: '📖 Tithi',
      karana: '🌊 Karana',
      gan: '👨‍👩‍👧 Gan',
      nadi: '💫 Nadi',
      varna: '🎨 Varna',
      vashya: '🤝 Vashya',
      yoni: '🐘 Yoni',
      tatva: '🌍 Tatva',
      paya: '💰 Paya',
      name_alphabet: '🔤 Alphabet'
    };

    let vedicRows = '';
    for (const key of vedicKeys) {
      const value = getValue(kundli, key, 'N/A');
      const label = vedicLabels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
      vedicRows += `
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #333; font-weight: bold; font-size: 12px; width: 40%;">${label}</td>
          <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; width: 60%;">${value}</td>
        </tr>
      `;
    }
    
    // ========== PANCHANG TABLE ==========
    const panchangKeys = ['sunrise', 'sunset', 'moonrise', 'tithi', 'nakshatra', 'yog', 'karan', 'paksha'];
    const panchangLabels = {
      sunrise: '🌅 Sunrise',
      sunset: '🌇 Sunset',
      moonrise: '🌙 Moonrise',
      tithi: '📖 Tithi',
      nakshatra: '⭐ Nakshatra',
      yog: '🧘 Yoga',
      karan: '🌊 Karana',
      paksha: '📖 Paksha'
    };

    let panchangRows = '';
    for (const key of panchangKeys) {
      const value = getValue(panchang, key, 'N/A');
      const label = panchangLabels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
      panchangRows += `
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #333; font-weight: bold; font-size: 12px; width: 40%;">${label}</td>
          <td style="padding: 6px 10px; border: 1px solid #333; font-size: 12px; width: 60%;">${value}</td>
        </tr>
      `;
    }
    
    // ========== GANASH JI IMAGE ==========
    const ganashImageUrl = 'https://www.vhv.rs/dpng/d/125-1253337_ganesh-ji-clipart-png-transparent-png-png-download.png';
    
    // ========== COMPLETE HTML ==========
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AstroPlanets - Kundli Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Times New Roman', 'Georgia', serif; 
      padding: 25px; 
      background: #ffffff; 
      color: #1a1a1a; 
      line-height: 1.5; 
      font-size: 12px;
    }
    .page { max-width: 1000px; margin: 0 auto; }
    
    .cover-page { 
      text-align: center; 
      padding: 50px 30px; 
      border: 4px double #D4A017; 
      margin-bottom: 30px; 
      background: #fdfaf5; 
      page-break-after: always;
      border-radius: 4px;
    }
    .cover-page .ganash-img { 
      max-width: 150px; 
      margin-bottom: 20px; 
      border-radius: 50%;
      border: 4px solid #D4A017;
      padding: 10px;
      background: #fff;
    }
    .cover-page h1 { 
      font-size: 36px; 
      letter-spacing: 3px; 
      color: #8B0000;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .cover-page .subtitle { 
      font-size: 16px; 
      color: #D4A017; 
      letter-spacing: 4px;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .cover-page .divider {
      width: 120px;
      height: 2px;
      background: #D4A017;
      margin: 15px auto;
    }
    .cover-page .user-name { 
      font-size: 26px; 
      font-weight: bold; 
      color: #1a1a1a;
      margin: 15px 0;
      letter-spacing: 1px;
    }
    .cover-page .details { 
      font-size: 13px; 
      color: #444; 
      line-height: 2;
    }
    .cover-page .details strong {
      color: #1a1a1a;
    }
    .cover-page .footer-text {
      margin-top: 30px;
      font-size: 10px;
      color: #888;
    }
    
    .header { 
      text-align: center; 
      margin-bottom: 20px; 
      padding-bottom: 12px; 
      border-bottom: 3px solid #D4A017;
    }
    .header h1 { 
      font-size: 24px; 
      letter-spacing: 3px; 
      color: #8B0000;
    }
    .header p { 
      font-size: 11px; 
      color: #666; 
      letter-spacing: 1px;
    }
    
    .user-info { 
      background: #f8f4e8; 
      padding: 12px 20px; 
      margin-bottom: 20px; 
      border: 1px solid #ccc; 
      text-align: center; 
      border-radius: 4px;
    }
    .user-info h3 { 
      font-size: 14px; 
      color: #8B0000;
      margin-bottom: 5px;
    }
    .user-info p { 
      margin: 3px 0; 
      font-size: 12px; 
    }
    
    .section { 
      margin-bottom: 18px; 
      border: 1px solid #333; 
      page-break-inside: avoid;
      border-radius: 4px;
      overflow: hidden;
    }
    .section-title { 
      background: #8B0000; 
      color: #fff;
      padding: 8px 16px; 
      font-size: 13px; 
      font-weight: bold; 
      letter-spacing: 1px;
    }
    .section-content { 
      padding: 12px 16px; 
      background: #fff; 
    }
    
    .ascendant-box { 
      text-align: center; 
      padding: 20px; 
      border: 3px solid #D4A017; 
      margin-bottom: 20px; 
      background: #fdfaf5; 
      border-radius: 8px;
    }
    .ascendant-label { 
      font-size: 12px; 
      letter-spacing: 3px; 
      color: #666;
    }
    .ascendant-value { 
      font-size: 34px; 
      font-weight: bold; 
      color: #8B0000;
      margin: 5px 0;
      text-transform: uppercase;
    }
    .ascendant-lord { 
      font-size: 14px; 
      color: #444;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 10px; 
    }
    th { 
      background: #8B0000; 
      color: #fff;
      padding: 8px 10px; 
      border: 1px solid #333; 
      font-weight: bold; 
      text-align: center; 
      font-size: 11px;
      letter-spacing: 1px;
    }
    td { 
      padding: 6px 10px; 
      border: 1px solid #333; 
      font-size: 12px; 
    }
    tr:nth-child(even) {
      background: #f8f4e8;
    }
    
    .manglik-yes { 
      background: #8B0000; 
      color: #fff; 
      padding: 12px; 
      text-align: center; 
      margin-bottom: 18px; 
      border: 1px solid #8B0000; 
      border-radius: 4px;
    }
    .manglik-no { 
      background: #e8f0e8; 
      color: #1a1a1a; 
      padding: 12px; 
      text-align: center; 
      margin-bottom: 18px; 
      border: 1px solid #2d5a27; 
      border-radius: 4px;
    }
    
    .dasha-box { 
      background: #f8f4e8; 
      padding: 12px 16px; 
      border: 1px solid #333; 
      text-align: center; 
      border-radius: 4px;
    }
    .dasha-box div {
      margin: 4px 0;
      font-size: 13px;
    }
    .dasha-box strong {
      color: #8B0000;
    }
    
    .footer { 
      text-align: center; 
      margin-top: 25px; 
      padding-top: 12px; 
      border-top: 2px solid #D4A017; 
      font-size: 9px; 
      color: #888; 
    }
    
    @media print {
      body { padding: 15px; }
      .section { break-inside: avoid; }
      .cover-page { page-break-after: always; }
    }
  </style>
</head>
<body>
<div class="page">
  
  <!-- COVER PAGE -->
  <div class="cover-page">
    <img src="${ganashImageUrl}" alt="Ganash Ji" class="ganash-img" onerror="this.style.display='none'">
    <h1>ASTROPLANETS</h1>
    <div class="subtitle">✦ Vedic Astrology ✦</div>
    <div class="divider"></div>
    <div class="user-name">${userName}</div>
    <div class="details">
      <p><strong>📅 Date of Birth:</strong> ${birthDate}</p>
      <p><strong>⏰ Time of Birth:</strong> ${birthTime}</p>
      <p><strong>⭐ Rashi:</strong> ${rashi} &nbsp;|&nbsp; <strong>🌙 Nakshatra:</strong> ${nakshatra}</p>
      <p><strong>🌅 Lagna:</strong> ${ascendant}</p>
    </div>
    <div class="divider"></div>
    <div class="footer-text">
      <p>Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString()}</p>
      <p>© ${new Date().getFullYear()} AstroPlanets - All Rights Reserved</p>
    </div>
  </div>
  
  <!-- DATA PAGE -->
  <div class="header">
    <h1>🔮 ASTROPLANETS</h1>
    <p>✦ ${userName} ✦</p>
  </div>
  
  <div class="user-info">
    <h3>📋 Birth Details</h3>
    <p><strong>Name:</strong> ${userName} &nbsp;|&nbsp; <strong>Email:</strong> ${userEmail}</p>
    <p><strong>DOB:</strong> ${birthDate} &nbsp;|&nbsp; <strong>Time:</strong> ${birthTime}</p>
  </div>
  
  <!-- ASCENDANT -->
  <div class="ascendant-box">
    <div class="ascendant-label">🌅 LAGNA (ASCENDANT)</div>
    <div class="ascendant-value">${ascendant}</div>
    <div class="ascendant-lord">Lord: ${ascendantLord}</div>
  </div>
  
  <!-- RASHI & NAKSHATRA -->
  <div class="section">
    <div class="section-title">⭐ RASHI &amp; NAKSHATRA</div>
    <div class="section-content">
      <table>
        <tr><td style="font-weight: bold; width: 50%;">Rashi (Moon Sign)</td><td>${rashi}</td></tr>
        <tr><td style="font-weight: bold;">Sign Lord</td><td>${signLord}</td></tr>
        <tr><td style="font-weight: bold;">Nakshatra (Birth Star)</td><td>${nakshatra}</td></tr>
        <tr><td style="font-weight: bold;">Nakshatra Lord</td><td>${nakshatraLord}</td></tr>
        <tr><td style="font-weight: bold;">Pada / Charan</td><td>${nakshatraPada}</td></tr>
      </table>
    </div>
  </div>
  
  <!-- MANGLIK DOSHA -->
  <div class="${manglik === 'Yes' || manglik === 'Manglik' ? 'manglik-yes' : 'manglik-no'}">
    <strong>🔴 MANGAL DOSHA</strong><br>
    <span style="font-size: 20px; font-weight: bold;">${manglik === 'Yes' || manglik === 'Manglik' ? '⚡ Manglik' : '✅ Non-Manglik'}</span>
  </div>
  
  <!-- PLANETS -->
  <div class="section">
    <div class="section-title">🪐 PLANETARY POSITIONS</div>
    <div class="section-content">
      <table>
        <thead>
          <tr><th>Planet</th><th>Sign</th><th>Degree</th><th>House</th><th>Retrograde</th></tr>
        </thead>
        <tbody>${planetsTableHtml}</tbody>
      </table>
    </div>
  </div>
  
  <!-- HOUSES - FIXED -->
  <div class="section">
    <div class="section-title">🏠 HOUSES (BHAVAS)</div>
    <div class="section-content">
      <table>
        <thead>
          <tr><th>House</th><th>Sign</th><th>Lord</th></tr>
        </thead>
        <tbody>${housesTableHtml}</tbody>
      </table>
    </div>
  </div>
  
  <!-- VEDIC DETAILS -->
  <div class="section">
    <div class="section-title">📖 VEDIC DETAILS</div>
    <div class="section-content">
      <table>${vedicRows}</table>
    </div>
  </div>
  
  <!-- DASHA -->
  <div class="section">
    <div class="section-title">⏳ CURRENT VIMSHOTTARI DASHA</div>
    <div class="section-content">
      <div class="dasha-box">
        <div><strong>Maha Dasha:</strong> ${mahaDasha}</div>
        <div><strong>Antar Dasha:</strong> ${antarDasha}</div>
        <div><strong>📅 Valid Until:</strong> ${dashaEndDate}</div>
      </div>
    </div>
  </div>
  
  <!-- PANCHANG -->
  <div class="section">
    <div class="section-title">📅 DAILY PANCHANG</div>
    <div class="section-content">
      <table>${panchangRows}</table>
    </div>
  </div>
  
  <div class="footer">
    <p>This report is based on Vedic astrology calculations.</p>
    <p>© ${new Date().getFullYear()} AstroPlanets - All Rights Reserved</p>
  </div>
  
</div>
</body>
</html>`;
    
    // ================================================================
    // ✅ PDF GENERATION
    // ================================================================
    
    console.log('📄 Generating PDF...');
    
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: '8mm',
      type: 'pdf',
      timeout: 60000,
      quality: '100',
    };
    
    pdf.create(htmlContent, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('❌ PDF generation error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'PDF generation failed: ' + err.message 
        });
      }
      
      console.log('✅ PDF generated successfully. Size:', buffer.length);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=kundli_report.pdf');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    });
    
  } catch (err) {
    console.error('❌ Download error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate PDF: ' + err.message 
    });
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