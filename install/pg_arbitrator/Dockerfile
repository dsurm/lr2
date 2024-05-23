FROM node:20.13

COPY ./agent/ /agent/

RUN useradd -s /bin/false -m user \
    && chown user -R /agent/

USER user

WORKDIR /agent/

RUN npm install ./

CMD node /agent/index.js