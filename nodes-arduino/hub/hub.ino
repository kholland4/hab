//RF24 sensor net hub: listens for data from up to 6 other radios and relays it via serial; no write support
#define BLOCK_SIZE 32
#define NUM_READ_PIPES 6

#include <SPI.h>
#include <RF24.h>
RF24 radio(9, 10);
const uint64_t pipeMask = 0xF0F0F0F000LL;
const uint8_t pipes[] = { 0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5 };

uint8_t pipeNum = 0;
char buf[32];

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
}
