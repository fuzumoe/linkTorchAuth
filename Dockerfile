# Stage 1: build the application
ARG BASE_IMAGE=harbor.camelot-group.com/common/node:22.16.0-alpine

FROM ${BASE_IMAGE} AS builder

WORKDIR /auth

COPY package*.json ./
COPY tsconfig*.json ./

RUN HUSKY=0 npm install

COPY ./src ./src

RUN npm run build

# Stage 2: create runtime image
FROM ${BASE_IMAGE}

ENV HUSKY=0

ENV HOME=/opt/auth LOGS=/opt/auth/logs

RUN mkdir -p ${HOME} ${LOGS} && \
    chown -R ${OWNER} ${HOME} ${LOGS}

WORKDIR ${HOME}

COPY --chown=${OWNER} package*.json ./


RUN HUSKY=0 su-exec ${OWNER} npm ci --production && su-exec ${OWNER} npm cache clean --force

COPY --chown=${OWNER} --from=builder /auth/dist ./dist

COPY server-start.sh /usr/bin

RUN dos2unix /usr/bin/server-start.sh && chmod a+x /usr/bin/server-start.sh

ARG INFO_COMMIT_HASH
ENV INFO_COMMIT_HASH=${INFO_COMMIT_HASH}

ARG INFO_BUILD_TIME
ENV INFO_BUILD_TIME=${INFO_BUILD_TIME}

ARG INFO_IMAGE_NAME
ENV INFO_IMAGE_NAME=${INFO_IMAGE_NAME}

ARG INFO_IMAGE_TAG
ENV INFO_IMAGE_TAG=${INFO_IMAGE_TAG}

ENV HOST=0.0.0.0 PORT=40116
ENV MEM_ALLOCATION_LIMIT=384

EXPOSE ${PORT}

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["server-start.sh"]
