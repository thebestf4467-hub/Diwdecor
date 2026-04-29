<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$token = 'r8_0Y9DMLLatXCty0LBUOpu7BmPZr6Jkeh0cZVge';
$body  = file_get_contents('php://input');
$data  = json_decode($body, true);
$prompt = isset($data['prompt']) ? $data['prompt'] : '';

if (!$prompt) { echo json_encode(['error' => 'No prompt']); exit; }

// إرسال الطلب لـ Replicate
$ch = curl_init('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode([
        'input' => [
            'prompt'      => $prompt,
            'width'       => 768,
            'height'      => 512,
            'num_outputs' => 1
        ]
    ]),
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
        'Prefer: wait'
    ],
    CURLOPT_TIMEOUT => 120
]);

$response = curl_exec($ch);
$result   = json_decode($response, true);
curl_close($ch);

// انتظر إذا لم يكتمل
if (isset($result['urls']['get']) && !isset($result['output'])) {
    for ($i = 0; $i < 30; $i++) {
        sleep(2);
        $ch2 = curl_init($result['urls']['get']);
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token]
        ]);
        $poll = json_decode(curl_exec($ch2), true);
        curl_close($ch2);
        if (isset($poll['status']) && $poll['status'] === 'succeeded') {
            $result = $poll;
            break;
        }
        if (isset($poll['status']) && $poll['status'] === 'failed') break;
    }
}

echo json_encode($result);
?>
