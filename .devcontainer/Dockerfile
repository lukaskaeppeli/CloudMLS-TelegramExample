
FROM ubuntu

# Installing required packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install software-properties-common \
    && add-apt-repository ppa:openjdk-r/ppa \
    && apt-get update \
    && apt-get -y install --no-install-recommends openjdk-8-jdk-headless nodejs wget npm git gradle

# Installing required node packages
RUN npm install -g @ionic/cli native-run cordova

ARG ANDROID_HOME="/opt/android-sdk"
ARG ANDROID_SDK_URL="https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip"

# https://developer.android.com/studio/#downloads
ENV ANDROID_SDK_URL="https://dl.google.com/android/repository/commandlinetools-linux-6858069_latest.zip" \
    ANDROID_BUILD_TOOLS_VERSION=30.0.3 \
    ANDROID_SDK_ROOT="/opt/android"

ENV PATH $PATH:$ANDROID_SDK_ROOT/cmdline-tools/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/$ANDROID_BUILD_TOOLS_VERSION

WORKDIR /opt

RUN mkdir android && cd android && \
    wget -O tools.zip ${ANDROID_SDK_URL} && \
    unzip tools.zip && rm tools.zip

RUN mkdir /root/.android && touch /root/.android/repositories.cfg && \
    while true; do echo 'y'; sleep 2; done | sdkmanager --sdk_root=${ANDROID_SDK_ROOT} "platform-tools" "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" && \
    while true; do echo 'y'; sleep 2; done | sdkmanager --sdk_root=${ANDROID_SDK_ROOT} "platforms;android-30"

RUN chmod a+x -R $ANDROID_SDK_ROOT && \
    chown -R root:root $ANDROID_SDK_ROOT && \
    rm -rf /opt/android/licenses && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    apt-get autoremove -y && \
    apt-get clean