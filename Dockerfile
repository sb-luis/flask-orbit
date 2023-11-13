# --- BASE ---
FROM python:3.7 AS base

WORKDIR /usr/src/app

# --- BUILD ---
FROM base  AS build 
# install all python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# copy all code
COPY . .

# expose port to access server
EXPOSE 8000

# --- BUILD ---
FROM base  AS dev 

CMD ["gunicorn"  , "-b", "0.0.0.0:8000", "--log-level", "debug", "app:app"]

# --- PRODUCTION ---
FROM build AS prod 

CMD ["gunicorn"  , "-b", "0.0.0.0:8000"]
#CMD [ "python", "-m", "flask", "run", "--host=0.0.0.0"]
#CMD [ "python", "./app.py"]