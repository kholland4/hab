//RF24 sensor net sensor - ultrasonic (cm)
#define BLOCK_SIZE 32
#define WRITE_ADDR 0xD1
#define READ_ADDR 0xE0

#define NODE_ID 8

#include <SPI.h>
#include <RF24.h>
RF24 radio(48, 49);
uint8_t pipeNum = 0;
const uint64_t pipeMask = 0xF0F0F0F000LL;
char buf[32];

#include <BricktronicsShield.h>
#include <BricktronicsMotor.h>
BricktronicsMotor yAxis(BricktronicsShield::MOTOR_1);
int xPos = 0;
int yPos = 0;
int oldAngle = 0;

int laserState = 0;
#define LASER_PIN 23

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

void updateMotors() {
  int angle = max(min(xPos, 180), 0);
  int pulseWidth = map(angle, 0, 180, 544, 2400);
  for(int i = 0; i < ceil(abs(angle - oldAngle) / 3); i++) {
  //for(int i = 0; i < 10; i++) {
    digitalWrite(7, HIGH);
    delayMicroseconds(pulseWidth);
    digitalWrite(7, LOW);
    delayMicroseconds(6000 - pulseWidth);
  }
  oldAngle = angle;
  
  //yAxis.goToAngleWaitForArrivalOrTimeout(map(max(min(yPos, 180), 0), 0, 180, 20, 160), 1000);
  yAxis.goToAngle(map(max(min(yPos, 180), 0), 0, 180, 20, 160));
}

void setup() {
  pinMode(13, OUTPUT);
  digitalWrite(13, LOW);
  //Init radio
  radio.begin();
  radio.openWritingPipe(WRITE_ADDR | pipeMask);
  radio.openReadingPipe(1, READ_ADDR | pipeMask);
  //don't enable dynamic payloads - all payloads will be 32 bytes
  radio.setAutoAck(true);
  radio.powerUp();
  radio.startListening();

  pinMode(LASER_PIN, OUTPUT);
  digitalWrite(LASER_PIN, LOW);
  
  pinMode(7, OUTPUT);
  digitalWrite(7, LOW);
  int angle = 0;
  int pulseWidth = map(angle, 0, 180, 544, 2400);
  for(int i = 0; i < 50; i++) {
    digitalWrite(7, HIGH);
    delayMicroseconds(pulseWidth);
    digitalWrite(7, LOW);
    delayMicroseconds(6000 - pulseWidth);
  }

  BricktronicsShield::begin();
  yAxis.begin();
  yAxis.setAngleOutputMultiplier(1);
  yAxis.setAngle(90);
}

void loop() {
  sendData(NODE_ID, ((uint16_t)xPos << 8) | (uint16_t)(yPos & 254) | (uint16_t)laserState);
  unsigned long timer = millis() + 250;
  while(millis() < timer) {
    if(radio.available(&pipeNum)) {
      radio.read(buf, BLOCK_SIZE);
      uint16_t from = (buf[0] << 8) | buf[1];
      uint16_t to = (buf[2] << 8) | buf[3];
      if(from == 0 && to == NODE_ID) {
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
        xPos = (data >> 8) & 255;
        yPos = data & 254;
        laserState = data & 1;
        digitalWrite(LASER_PIN, laserState);
        updateMotors();
      }
    }

    yAxis.update();
  }
}
