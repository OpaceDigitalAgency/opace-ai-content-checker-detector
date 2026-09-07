<?php

declare(strict_types=1);

namespace Opace\ContentIntegrity\Contracts;

use InvalidArgumentException;
use Opis\JsonSchema\Errors\ErrorFormatter;
use Opis\JsonSchema\Validator;
use RuntimeException;
use stdClass;

final class ContractValidator
{
    private const SCHEMA_BASE_URI = 'https://schemas.opace.agency/content-integrity/v1/';

    /** @var Validator */
    private $validator;

    /** @var string */
    private $schemaDirectory;

    /** @var string[] */
    private $schemas = array();

    public function __construct(string $schemaDirectory)
    {
        $realDirectory = realpath($schemaDirectory);

        if ($realDirectory === false || !is_dir($realDirectory)) {
            throw new InvalidArgumentException('Schema directory does not exist: ' . $schemaDirectory);
        }

        $this->schemaDirectory = $realDirectory;
        $this->validator = new Validator(null, 100, false);
        $this->registerSchemas();
    }

    /**
     * Reader-mode validation accepts same-major additive fields only where the
     * canonical schema permits them. Unknown enums and incompatible majors fail.
     *
     * @param mixed $data
     */
    public function validate($data, string $schemaFile): ValidationOutcome
    {
        if (!isset($this->schemas[$schemaFile])) {
            throw new InvalidArgumentException('Unknown contract schema: ' . $schemaFile);
        }

        $result = $this->validator->validate($data, self::SCHEMA_BASE_URI . $schemaFile);
        $errors = array();

        if (!$result->isValid() && $result->error() !== null) {
            $formatter = new ErrorFormatter();

            foreach ($formatter->formatFlat($result->error()) as $error) {
                $errors[] = is_string($error) ? $error : json_encode($error);
            }
        }

        if ($errors === array()) {
            $errors = $this->semanticErrors($data, $schemaFile);
        }

        return new ValidationOutcome($errors);
    }

    private function registerSchemas(): void
    {
        $files = glob($this->schemaDirectory . '/*.schema.json');

        if ($files === false || $files === array()) {
            throw new RuntimeException('No contract schemas found in ' . $this->schemaDirectory);
        }

        $resolver = $this->validator->resolver();

        if ($resolver === null) {
            throw new RuntimeException('JSON Schema resolver is unavailable');
        }

        foreach ($files as $file) {
            $json = file_get_contents($file);
            $schema = is_string($json) ? json_decode($json) : null;

            if (!$schema instanceof stdClass || json_last_error() !== JSON_ERROR_NONE) {
                throw new RuntimeException('Invalid JSON schema: ' . $file);
            }

            if (!$resolver->registerRaw($schema)) {
                throw new RuntimeException('Unable to register JSON schema: ' . $file);
            }

            $this->schemas[basename($file)] = (string) $schema->{'$id'};
        }
    }

    /**
     * Cross-field invariants which Draft 2020-12 cannot express directly.
     *
     * @param mixed $data
     * @return string[]
     */
    private function semanticErrors($data, string $schemaFile): array
    {
        if (!$data instanceof stdClass) {
            return array();
        }

        $errors = array();

        if ($schemaFile === 'protected-span.schema.json') {
            $this->validateProtectedSpan($data, '$', $errors);
        }

        if ($schemaFile === 'rewrite-request.schema.json' || $schemaFile === 'analysis-result.schema.json') {
            $sourceHash = isset($data->source->content_hash) && is_string($data->source->content_hash)
                ? $data->source->content_hash
                : null;

            if (isset($data->protected_spans) && is_array($data->protected_spans)) {
                foreach ($data->protected_spans as $index => $span) {
                    if ($span instanceof stdClass) {
                        $this->validateProtectedSpan($span, '$.protected_spans[' . $index . ']', $errors);

                        if ($sourceHash !== null && isset($span->content_hash) && $span->content_hash !== $sourceHash) {
                            $errors[] = '$.protected_spans[' . $index . '].content_hash must match $.source.content_hash';
                        }
                    }
                }
            }
        }

        if ($schemaFile === 'pattern-finding.schema.json' && isset($data->span) && $data->span instanceof stdClass) {
            $this->validateOffsetOrder($data->span, '$.span', $errors);
        }

        return $errors;
    }

    /**
     * @param string[] $errors
     */
    private function validateProtectedSpan(stdClass $span, string $path, array &$errors): void
    {
        $this->validateOffsetOrder($span, $path, $errors);

        if (!isset($span->text) || !is_string($span->text)) {
            return;
        }

        if (isset($span->start_utf16, $span->end_utf16)) {
            $expectedUtf16 = intdiv(strlen(mb_convert_encoding($span->text, 'UTF-16BE', 'UTF-8')), 2);
            $actualUtf16 = $span->end_utf16 - $span->start_utf16;

            if ($actualUtf16 !== $expectedUtf16) {
                $errors[] = $path . ' UTF-16 offset width must equal the text UTF-16 code-unit length';
            }
        }

        if (isset($span->start_codepoint, $span->end_codepoint)) {
            $expectedCodepoints = mb_strlen($span->text, 'UTF-8');
            $actualCodepoints = $span->end_codepoint - $span->start_codepoint;

            if ($actualCodepoints !== $expectedCodepoints) {
                $errors[] = $path . ' code-point offset width must equal the text code-point length';
            }
        }
    }

    /**
     * @param string[] $errors
     */
    private function validateOffsetOrder(stdClass $span, string $path, array &$errors): void
    {
        if (isset($span->start_utf16, $span->end_utf16) && $span->end_utf16 <= $span->start_utf16) {
            $errors[] = $path . '.end_utf16 must be greater than start_utf16';
        }

        if (isset($span->start_codepoint, $span->end_codepoint) && $span->end_codepoint <= $span->start_codepoint) {
            $errors[] = $path . '.end_codepoint must be greater than start_codepoint';
        }
    }
}
