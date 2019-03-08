//RF24 sensor net sensor - ultrasonic (cm)
#define BLOCK_SIZE 32
#define WRITE_ADDR 0xD0

#include <avr/sleep.h>
#include <avr/power.h>
#include <avr/wdt.h>

#include <SPI.h>
#include <RF24.h>
RF24 radio(9, 10);
const uint64_t pipeMask = 0xF0F0F0F000LL;
char buf[32];

#include <NewPing.h>
NewPing sonar(4, 5, 200); //TRIG, ECHO, max distance (cm)

void sendData() {
  memset(buf, 0, BLOCK_SIZE);

  int data = (int)sonar.ping_cm();
  byte cstr[16];
  memset(cstr, 0, 16);
  itoa(data, cstr, 10);
  
  buf[0] = 0x00; buf[1] = 0x05; //src id
  buf[2] = 0x00; buf[3] = 0x00; //dest id
  buf[4] = 's'; buf[5] = 't'; buf[6] = 'a'; buf[7] = 't'; buf[8] = 'e'; buf[9] = ',';
  for(int i = 0; i < 16; i++) {
    buf[10 + i] = cstr[i];
  }
  
  radio.powerUp();
  radio.write(buf, BLOCK_SIZE);
  radio.powerDown();
}

void enterSleep() {
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  sleep_enable();
  sleep_mode(); //could handle interrupt with ISR(WDT_vect) { ... }
  sleep_disable();
  power_all_enable();
}

void setup() {
  //pinMode(3, OUTPUT); //Sonar power
  //digitalWrite(3, LOW);
  
  //Configure watchdog timer (WDT) (see donalmorrissey.blogspot.com/2010/04/sleeping-arduino-part-5-wake-up-via.html)
  MCUSR &= ~(1<<WDRF); //Clear the reset flag
  WDTCSR |= (1<<WDCE) | (1<<WDE); //Allow changing WDT prescaler
  //WDTCSR = 1<<WDP0 | 1<<WDP3; //8 seconds
  //WDTCSR = 1<<WDP0 | 1<<WDP1 | 1<<WDP2; //2 seconds
  WDTCSR = 1<<WDP2; //0.25 seconds
  WDTCSR |= _BV(WDIE); //Enable WDT interrupt (no reset)
  
  //Init radio
  radio.begin();
  radio.openWritingPipe(WRITE_ADDR | pipeMask);
  //don't enable dynamic payloads - all payloads will be 32 bytes
  radio.setAutoAck(true);
  radio.powerDown();
  //don't listen
}

void loop() {
  sendData();
  enterSleep();
}
