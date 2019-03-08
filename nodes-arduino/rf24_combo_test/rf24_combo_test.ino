//RF24 sensor net sensor - ultrasonic (cm)
#define BLOCK_SIZE 32
#define WRITE_ADDR 0xD0
#define READ_ADDR 0xE0

#include <SPI.h>
#include <RF24.h>
RF24 radio(8, 10);
uint8_t pipeNum = 0;
const uint64_t pipeMask = 0xF0F0F0F000LL;
char buf[32];

#include <NewPing.h>
NewPing sonar(4, 5, 200); //TRIG, ECHO, max distance (cm)

#include <TonePlayer.h>
TonePlayer tone1(TCCR1A, TCCR1B, OCR1AH, OCR1AL, TCNT1H, TCNT1L);

int lampState = 0;
int lampState2 = 0;
int spkState = 0;
//int buttonState = 0;

#include <Adafruit_NeoPixel.h>
#define NEOPIXEL_PIN A0
Adafruit_NeoPixel strip = Adafruit_NeoPixel(8, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

void updateNeopixel() {
  for(int i = 0; i < strip.numPixels(); i++) {
    strip.setPixelColor(i, ((lampState2 >> 8) & 15) * 16, ((lampState2 >> 4) & 15) * 16, (lampState2 & 15) * 16);
  }
  strip.show();
}

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
  pinMode(9, OUTPUT); //for tone
  
  pinMode(6, OUTPUT);
  digitalWrite(6, LOW);

  pinMode(7, INPUT_PULLUP);

  strip.begin();
  strip.setBrightness(255);
  strip.show();
  
  //Init radio
  radio.begin();
  radio.openWritingPipe(WRITE_ADDR | pipeMask);
  radio.openReadingPipe(1, READ_ADDR | pipeMask);
  //don't enable dynamic payloads - all payloads will be 32 bytes
  radio.setAutoAck(true);
  radio.powerUp();
  radio.startListening();
}

int prescaler = 0;

void loop() {
  if(prescaler == 4) {
    sendData(5, (int)sonar.ping_cm());
    prescaler++;
  } else if(prescaler == 6) {
    sendData(6, lampState);
    prescaler++;
  } else if(prescaler == 8) {
    sendData(10, lampState2);
    prescaler = 0;
  } else {
    prescaler++;
  }
  sendData(2, !digitalRead(7));
  unsigned long timer = millis() + 62;
  while(millis() < timer) {
    if(radio.available(&pipeNum)) {
      radio.read(buf, BLOCK_SIZE);
      uint16_t from = (buf[0] << 8) | buf[1];
      uint16_t to = (buf[2] << 8) | buf[3];
      if(to == 6 || to == 7 || to == 10) {
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
        if(to == 6) {
          lampState = data;
          digitalWrite(6, data);
        } else if(to == 10) {
          lampState2 = data;
          updateNeopixel();
        } else if(to == 7) {
          spkState = data;
          //tone(3, data, 250);
          if(data < 0) {
            tone1.noTone();
          } else {
            tone1.tone(data);
          }
        }
      }
    }
  }
}
