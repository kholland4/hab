//RF24 sensor net hub: listens for data from up to 6 other radios and relays it via serial; includes write support
#define BLOCK_SIZE 32
#define NUM_READ_PIPES 6
#define NUM_WRITE_PIPES 6

#include <SPI.h>
#include <RF24.h>
RF24 radio(9, 10);
const uint64_t pipeMask = 0xF0F0F0F000LL;
const uint8_t pipes[] = { 0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5 };
const uint8_t pipes_write[] = { 0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5 };

uint8_t pipeNum = 0;
char buf[32];
char serialBuf[64];

void setup() {
  Serial.begin(57600); //Pro Minis have trouble with higher baud rates
  
  radio.begin();
  for(int i = 0; i < NUM_READ_PIPES; i++) {
    radio.openReadingPipe(i, pipes[i] | pipeMask);
  }
  //don't enable dynamic payloads - all payloads will be 32 bytes
  radio.setAutoAck(true);
  radio.powerUp();
  radio.startListening();
}

void loop() {
  if(radio.available(&pipeNum)) {
    radio.read(buf, BLOCK_SIZE);
    uint16_t from = (buf[0] << 8) | buf[1];
    uint16_t to = (buf[2] << 8) | buf[3];
    Serial.print(from); Serial.print(","); Serial.print(to); Serial.print(",");
    for(int i = 4; i < 32; i++) {
      Serial.write(buf[i]);
      if(buf[i] == 0) {
        break;
      }
    }
  }

  if(Serial.available()) {
    delay(10); //buffer entire message
    int ptr = 0;
    memset(serialBuf, 0, 64);
    while(Serial.available() && ptr < 64) {
      serialBuf[ptr++] = Serial.read();
    }

    memset(buf, 0, BLOCK_SIZE);

    int src = 0;
    int dest = 0;
    
    char cbuf[64];
    int idx = 0;
    memset(cbuf, 0, 64);
    for(int i = 0; i < 16; i++) {
      if(serialBuf[i] == ',' || i == 15) {
        idx = i + 1;
        break;
      } else {
        cbuf[i] = serialBuf[i];
      }
    }
    src = atoi(cbuf);

    memset(cbuf, 0, 16);
    for(int i = idx; i < 64; i++) {
      if(serialBuf[i] == ',' || i - idx == 15) {
        idx = i + 1;
        break;
      } else {
        cbuf[i - idx] = serialBuf[i];
      }
    }
    dest = atoi(cbuf);

    buf[0] = (src >> 8) & 255; buf[1] = src & 255; //src id
    buf[2] = (dest >> 8) & 255; buf[3] = dest & 255; //dest id
    for(int i = idx; i < 64 && i - idx < 32; i++) {
      if(serialBuf[i] == '\0') {
        break;
      } else {
        buf[i - idx + 4] = serialBuf[i];
      }
    }
    radio.stopListening();
    for(int i = 0; i < NUM_WRITE_PIPES; i++) {
      radio.openWritingPipe(pipes_write[0] | pipeMask);
      radio.write(buf, BLOCK_SIZE);
    }
    radio.openReadingPipe(0, pipes[0] | pipeMask);
    radio.startListening();
  }
}
