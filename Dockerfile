FROM node:8.15.0-alpine

COPY . .

RUN apk add --no-cache --virtual npm-deps python make g++ && \
    python -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip install --upgrade pip setuptools && \
	rm -r /root/.cache

RUN cd nda && npm install

EXPOSE 3000

RUN cd nda && npm run start:watch