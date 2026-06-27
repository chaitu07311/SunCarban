FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt /app/requirements.txt
COPY requirements-ai.txt /app/requirements-ai.txt

ARG INSTALL_AI_DEPS=false
RUN pip install --no-cache-dir -r /app/requirements.txt \
	&& if [ "$INSTALL_AI_DEPS" = "true" ]; then pip install --no-cache-dir -r /app/requirements-ai.txt; fi

COPY app /app/app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
