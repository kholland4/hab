//RF24 sensor net sensor - ultrasonic (cm)
#define BLOCK_SIZE 32
#define WRITE_ADDR 0xD0
#define READ_ADDR 0xE0

#include <SPI.h>
#include <RF24.h>
RF24 radio(9, 10);
uint8_t pipeNum = 0;
const uint64_t pipeMask = 0xF0F0F0F000LL;
char buf[32];

#include <NewPing.h>
NewPing sonar(4, 5, 200); //TRIG, ECHO, max distance (cm)

int lampState = 0;

void sendData(uint16_t srcID, int data) {
  memset(buf, 0, BLOCK_SIZE);

  byte cstr[16];
  memset(cstr, 0, 16);
  itoa(data, cstr, 10);
  
  buf[0] = (srcID >> 8) & 255; buf[1] = srcID & 255; //src id
  buf[2] = 0x00; buf[3] = 0x00; //dest id
  buf[4] = 's'; buf[5] = 't'; buf[6] = 'a'; buf[7] = 't'; buf[8] = 'e'; buf[9] = ',';
  for(int i = 0; i < 16; i++) {
    buf[10 + i] = cstr[i];
  }
  
  radio.stopListening();
  radio.write(buf, BLOCK_SIZE);
  radio.startListening();
}

void setup() {
  pinMode(3, OUTPUT);
  digitalWrite(3, LOW);
  //Init radio
  radio.begin();
  radio.openWritingPipe(WRITE_ADDR | pipeMask);
  radio.openReadingPipe(1, READ_ADDR | pipeMask);
  //don't enable dynamic payloads - all payloads will be 32 bytes
  radio.setAutoAck(true);
  radio.powerUp();
  radio.startListening();
}

void loop() {
  sendData(5, (int)sonar.ping_cm());
  sendData(6, lampState);
  unsigned long timer = millis() + 250;
  while(millis() < timer) {
    if(radio.available(&pipeNum)) {
      radio.read(buf, BLOCK_SIZE);
      uint16_t from = (buf[0] << 8) | buf[1];
      uint16_t to = (buf[2] << 8) | buf[3];
      if(from == 0 && to == 6) {
        char cbuf[16];
        int idx = 13;
        memset(cbuf, 0, 16);
        for(int i = idx; i < BLOCK_SIZE; i++) {
          if(buf[i] == '\0') {
            break;
          } else {
            cbuf[i - idx] = buf[i];
          }
        }
        int data = atoi(cbuf);
        lampState = data;
        digitalWrite(3, data);
      }
    }
  }
}
