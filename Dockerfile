FROM node:alpine

COPY . .

RUN cd nda

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "start:watch"]