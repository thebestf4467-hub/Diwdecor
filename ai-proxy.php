<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$body   = file_get_contents('php://input');
$data   = json_decode($body, true);
$prompt = isset($data['prompt']) ? $data['prompt'] : '';

if (!$prompt) { echo json_encode(['error' => 'No prompt']); exit; }

$GEMINI_KEY = 'AIzaSyBecUarLzsvwpyTSNk1CH_NasN1d8LUXBo';

// Step 1: استخدم Gemini لتحسين الوصف بالإنجليزي
$geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $GEMINI_KEY;
$geminiBody = json_encode([
    'contents' => [[
        'parts' => [[
            'text' => 'Translate and enhance this interior design description to a detailed English prompt for image generation (respond with ONLY the prompt, no explanation): ' . $prompt
        ]]
    ]]
]);

$ch = curl_init($geminiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $geminiBody,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 30
]);
$geminiRes  = curl_exec($ch);
curl_close($ch);

$geminiData = json_decode($geminiRes, true);
$enhancedPrompt = isset($geminiData['candidates'][0]['content']['parts'][0]['text'])
    ? trim($geminiData['candidates'][0]['content']['parts'][0]['text'])
    : $prompt;

// Step 2: توليد الصورة عبر Pollinations
$seed = rand(1, 999999);
$imageUrl = 'https://image.pollinations.ai/prompt/' . urlencode($enhancedPrompt) . '?width=768&height=512&nologo=true&seed=' . $seed;

// تحميل الصورة من Pollinations وإرجاعها كـ base64
$ch2 = curl_init($imageUrl);
curl_setopt_array($ch2, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 60
]);
$imageData = curl_exec($ch2);
$httpCode  = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

if ($httpCode === 200 && $imageData) {
    $base64 = base64_encode($imageData);
    echo json_encode([
        'success'  => true,
        'image'    => 'data:image/jpeg;base64,' . $base64,
        'prompt'   => $enhancedPrompt
    ]);
} else {
    echo json_encode(['error' => 'Image generation failed', 'code' => $httpCode]);
}
?>
