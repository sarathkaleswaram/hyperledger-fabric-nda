FROM node:8.15.0-alpine

ENV MONGO_URL mongo:27017

ENV DEFAULT_WORKDIR /opt
ENV NDA_APP_PATH $DEFAULT_WORKDIR/hyperledger-fabric-nda

WORKDIR $DEFAULT_WORKDIR

COPY . $NDA_APP_PATH

RUN apk add --no-cache --virtual npm-deps python make g++ && \
    python -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip install --upgrade pip setuptools && \
	rm -r /root/.cache

RUN cd $NDA_APP_PATH && npm install

RUN cd $NDA_APP_PATH && npm run build

EXPOSE 3000

CMD node $NDA_APP_PATH/dist/server.js