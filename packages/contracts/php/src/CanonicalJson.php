<?php

declare(strict_types=1);

namespace Opace\ContentIntegrity\Contracts;

use InvalidArgumentException;
use RuntimeException;
use stdClass;

final class CanonicalJson
{
    public function canonicalize(string $json): string
    {
        $value = json_decode($json, false, 512);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException('Invalid JSON: ' . json_last_error_msg());
        }

        return $this->encode($value);
    }

    public function sha256(string $json): string
    {
        return hash('sha256', $this->canonicalize($json));
    }

    /**
     * @param mixed $value
     */
    private function encode($value): string
    {
        if ($value === null) {
            return 'null';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_int($value) || is_float($value)) {
            return $this->encodeNumber((float) $value);
        }

        if (is_string($value)) {
            $encoded = json_encode(
                $value,
                JSON_UNESCAPED_LINE_TERMINATORS | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );

            if (!is_string($encoded)) {
                throw new RuntimeException('Unable to encode a JSON string: ' . json_last_error_msg());
            }

            return $encoded;
        }

        if (is_array($value)) {
            $items = array();

            foreach ($value as $item) {
                $items[] = $this->encode($item);
            }

            return '[' . implode(',', $items) . ']';
        }

        if ($value instanceof stdClass) {
            return $this->encodeObject($value);
        }

        throw new InvalidArgumentException('Unsupported JSON value');
    }

    private function encodeObject(stdClass $value): string
    {
        $properties = get_object_vars($value);
        $keys = array_keys($properties);

        usort($keys, static function (string $left, string $right): int {
            $leftUtf16 = mb_convert_encoding($left, 'UTF-16BE', 'UTF-8');
            $rightUtf16 = mb_convert_encoding($right, 'UTF-16BE', 'UTF-8');

            return strcmp($leftUtf16, $rightUtf16);
        });

        $members = array();

        foreach ($keys as $key) {
            $members[] = $this->encode((string) $key) . ':' . $this->encode($properties[$key]);
        }

        return '{' . implode(',', $members) . '}';
    }

    private function encodeNumber(float $number): string
    {
        if (is_nan($number) || is_infinite($number)) {
            throw new InvalidArgumentException('RFC 8785 does not permit NaN or Infinity');
        }

        if ($number == 0.0) {
            return '0';
        }

        $negative = $number < 0.0;
        $previousPrecision = ini_get('serialize_precision');

        try {
            ini_set('serialize_precision', '-1');
            $native = json_encode(abs($number));
        } finally {
            if ($previousPrecision !== false) {
                ini_set('serialize_precision', (string) $previousPrecision);
            }
        }

        if (!is_string($native)
            || preg_match('/^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/', $native, $parts) !== 1
        ) {
            throw new RuntimeException('Unexpected PHP number representation');
        }

        $integer = $parts[1];
        $fraction = isset($parts[2]) ? $parts[2] : '';
        $exponent = isset($parts[3]) ? (int) $parts[3] : 0;
        $allDigits = $integer . $fraction;
        $leadingZeros = strlen($allDigits) - strlen(ltrim($allDigits, '0'));
        $digits = ltrim($allDigits, '0');
        $decimalPosition = strlen($integer) + $exponent - $leadingZeros;
        $digits = rtrim($digits, '0');

        if ($digits === '') {
            return '0';
        }

        $length = strlen($digits);

        if ($length <= $decimalPosition && $decimalPosition <= 21) {
            $result = $digits . str_repeat('0', $decimalPosition - $length);
        } elseif (0 < $decimalPosition && $decimalPosition <= 21) {
            $result = substr($digits, 0, $decimalPosition) . '.' . substr($digits, $decimalPosition);
        } elseif (-6 < $decimalPosition && $decimalPosition <= 0) {
            $result = '0.' . str_repeat('0', -$decimalPosition) . $digits;
        } else {
            $scientificExponent = $decimalPosition - 1;
            $mantissa = $length === 1 ? $digits : $digits[0] . '.' . substr($digits, 1);
            $result = $mantissa . 'e' . ($scientificExponent >= 0 ? '+' : '-') . abs($scientificExponent);
        }

        return ($negative ? '-' : '') . $result;
    }
}
