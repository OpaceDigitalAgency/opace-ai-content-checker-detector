<?php

declare(strict_types=1);

use Opace\ContentIntegrity\Contracts\CanonicalJson;
use Opace\ContentIntegrity\Contracts\ContractValidator;
use Opace\ContentIntegrity\Contracts\WordPress\PublicApiContract;
use Opace\ContentIntegrity\Contracts\WordPress\PublicApiIdentity;

$root = dirname(__DIR__, 2);
$autoload = $root . '/packages/contracts/php/vendor/autoload.php';

if (!is_file($autoload)) {
    fwrite(STDERR, "Missing PHP dependencies. Run Composer install in packages/contracts/php.\n");
    exit(2);
}

require $autoload;

$validator = new ContractValidator($root . '/schemas/v1');
$canonicalJson = new CanonicalJson();
$assertions = 0;
$failures = array();

$assert = static function (bool $condition, string $message) use (&$assertions, &$failures): void {
    $assertions++;

    if (!$condition) {
        $failures[] = $message;
    }
};

$loadFixture = static function (string $path): stdClass {
    $json = file_get_contents($path);
    $fixture = is_string($json) ? json_decode($json) : null;

    if (!$fixture instanceof stdClass || json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException('Invalid fixture JSON: ' . $path);
    }

    return $fixture;
};

$fixtureCount = 0;

foreach (array('valid' => true, 'invalid' => false) as $directory => $expectedValid) {
    $paths = glob($root . '/fixtures/contracts/' . $directory . '/*.json');

    if ($paths === false || $paths === array()) {
        throw new RuntimeException('No ' . $directory . ' contract fixtures found');
    }

    sort($paths, SORT_STRING);

    foreach ($paths as $path) {
        $fixture = $loadFixture($path);
        $outcome = $validator->validate($fixture->data, $fixture->schema);
        $fixtureCount++;

        $assert(
            $outcome->isValid() === $expectedValid,
            sprintf(
                '%s should be %s; errors: %s',
                basename($path),
                $expectedValid ? 'valid' : 'invalid',
                implode(' | ', $outcome->errors())
            )
        );
    }
}

$additiveFixture = $loadFixture($root . '/fixtures/contracts/valid/unknown-additive-field.json');
$assert(
    $validator->validate($additiveFixture->data, $additiveFixture->schema)->isValid(),
    'Reader mode must accept a same-major additive field allowed by the schema'
);

$sourceHashFixture = $loadFixture($root . '/fixtures/contracts/valid/rewrite-request.json');
$spanFixture = $loadFixture($root . '/fixtures/contracts/valid/protected-spans.json');
$sourceHashFixture->data->source->content_hash = 'sha256:' . str_repeat('a', 64);
$spanFixture->data->content_hash = 'sha256:' . str_repeat('b', 64);
$sourceHashFixture->data->protected_spans = array($spanFixture->data);
$assert(
    !$validator->validate($sourceHashFixture->data, $sourceHashFixture->schema)->isValid(),
    'A protected span content_hash mismatch must fail closed'
);

$hashPaths = glob($root . '/fixtures/contracts/hash/*.json');

if ($hashPaths === false || $hashPaths === array()) {
    throw new RuntimeException('No canonical hash fixtures found');
}

sort($hashPaths, SORT_STRING);

foreach ($hashPaths as $path) {
    $fixture = $loadFixture($path);
    $json = json_encode(
        $fixture->value,
        JSON_UNESCAPED_LINE_TERMINATORS | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );

    if (!is_string($json)) {
        throw new RuntimeException('Unable to encode hash fixture: ' . $path);
    }

    $canonical = $canonicalJson->canonicalize($json);
    $assert($canonical === $fixture->canonical, basename($path) . ' canonical bytes differ');
    $assert($canonicalJson->sha256($json) === $fixture->sha256, basename($path) . ' SHA-256 differs');
}

$utf16Input = '{"\\ue000":1,"\\ud800\\udc00":2}';
$utf16Expected = '{"𐀀":2,"":1}';
$assert(
    $canonicalJson->canonicalize($utf16Input) === $utf16Expected,
    'Astral keys must sort before U+E000 by UTF-16 code units'
);

$numberCases = array(
    '{"n":-0.0}' => '{"n":0}',
    '{"n":1e20}' => '{"n":100000000000000000000}',
    '{"n":1e21}' => '{"n":1e+21}',
    '{"n":1e-6}' => '{"n":0.000001}',
    '{"n":1e-7}' => '{"n":1e-7}',
    '{"0":"object","1":"not-an-array"}' => '{"0":"object","1":"not-an-array"}',
);

foreach ($numberCases as $input => $expected) {
    $assert(
        $canonicalJson->canonicalize($input) === $expected,
        'RFC 8785 boundary case differs for ' . $input
    );
}

$reflection = new ReflectionClass(PublicApiContract::class);
$methods = array_map(static function (ReflectionMethod $method): string {
    return $method->getName();
}, $reflection->getMethods(ReflectionMethod::IS_PUBLIC));

$assert(PublicApiIdentity::API_VERSION === '1.0', 'Public API version must be 1.0');
$assert(
    PublicApiIdentity::FACADE_CLASS === 'Opace\\ContentIntegrity\\Integration\\PublicApi',
    'DEC-21 facade class identity differs'
);
$assert(PublicApiIdentity::INSTANCE_METHOD === 'instance', 'DEC-21 singleton method differs');
$assert(PublicApiIdentity::READY_HOOK === 'oaci_ready', 'DEC-21 readiness hook differs');
$assert($methods === PublicApiIdentity::PUBLIC_METHODS, 'DEC-21 PHP method set or snake_case identity differs');

$apiFixture = $loadFixture($root . '/fixtures/integration/php-public-api-v1.json');
$assert(
    PublicApiIdentity::FACADE_CLASS . '::' . PublicApiIdentity::INSTANCE_METHOD . '()' === $apiFixture->identity,
    'DEC-21 facade identity differs from the integration fixture'
);
$assert(PublicApiIdentity::READY_HOOK === $apiFixture->ready_hook, 'DEC-21 hook differs from the integration fixture');
$assert($methods === $apiFixture->methods, 'DEC-21 method set differs from the integration fixture');

if ($failures !== array()) {
    foreach ($failures as $failure) {
        fwrite(STDERR, 'FAIL: ' . $failure . "\n");
    }

    fwrite(STDERR, sprintf("php: %d assertion(s), %d failure(s)\n", $assertions, count($failures)));
    exit(1);
}

echo sprintf(
    "php: %d contract fixtures, %d hash vectors and %d assertions passed\n",
    $fixtureCount,
    count($hashPaths),
    $assertions
);
