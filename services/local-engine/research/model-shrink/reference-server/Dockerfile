# Reference image for the inference endpoint. The model is baked in: pulling a
# 134 MB file from object storage at boot adds a second or more to every cold
# start, and the image layer is cached by the platform.
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# model/ must contain the served .onnx (see MODEL_PATH in deploy.sh), its
# config + thresholds files, and tokenizer/
COPY model/ ./model/
COPY c5features/ ./c5features/
COPY segments.py c5norm.py wordpress_channel.py extension_channel.py app.py ./

RUN useradd --system --uid 10001 app && chown -R app /srv
USER app

EXPOSE 8080
# ONE worker, deliberately. Rate-limit counters, token-use counters and the
# global-quota delta are per-process; a second worker halves the effectiveness
# of every in-memory limit for no throughput gain, because a single vCPU is
# already saturated by one worker running two ONNX Runtime threads.
#
# Access logging is off: the default access log records the URL and status,
# which is harmless in itself, but removing it removes any route by which a
# future middleware could add the body to it. Nothing in this service ever puts
# request text in a URL, so no log on this box or in Cloud Run's own request
# log can contain a document.
CMD ["uvicorn", "app:APP", "--host", "0.0.0.0", "--port", "8080", \
     "--workers", "1", "--no-access-log", "--log-level", "warning", \
     "--timeout-keep-alive", "15"]
