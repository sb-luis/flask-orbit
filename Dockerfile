# --- BASE ---
FROM python:3.7 AS base

WORKDIR /usr/src/app

# --- BUILD ---
FROM base  AS build 
# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install dependencies
RUN pip install --upgrade pip
COPY ./requirements.txt /usr/src/app/requirements.txt
RUN pip install -r requirements.txt


# copy all code
COPY . .

# expose port to access server
EXPOSE 8000

# --- DEV ---
#FROM base AS dev 

#CMD ["gunicorn"  , "-b", "0.0.0.0:8000", "--log-level", "debug", "app:app"]

# --- PRODUCTION ---
FROM build AS prod 

CMD ["gunicorn"  , "-b", "0.0.0.0:8000", "app:app"]
#CMD [ "python", "-m", "flask", "run", "--host=0.0.0.0"]
#CMD [ "python", "./app.py"]