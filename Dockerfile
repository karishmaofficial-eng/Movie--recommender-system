# Use a lightweight official Python runtime
FROM python:3.11-slim

# Set environmental variables to optimize python execution inside container
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 5000 to the host machine
EXPOSE 5000

# Run gunicorn to serve the Flask app on host 0.0.0.0 (making it bindable)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
