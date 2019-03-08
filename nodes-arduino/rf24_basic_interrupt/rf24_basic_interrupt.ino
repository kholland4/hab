//RF24 sensor net sensor - interrupt button
#define BLOCK_SIZE 32
#define WRITE_ADDR 0xD1

#include <avr/sleep.h>
#include <avr/power.h>
#include <avr/wdt.h>

#include <SPI.h>
#include <RF24.h>
RF24 radio(9, 10);
const uint64_t pipeMask = 0xF0F0F0F000LL;
char buf[32];

void sendData(bool data) {
  memset(buf, 0, BLOCK_SIZE);
  
  buf[0] = 0x00; buf[1] = 0x0C; //src id
  buf[2] = 0x00; buf[3] = 0x00; //dest id
  buf[4] = 's'; buf[5] = 't'; buf[6] = 'a'; buf[7] = 't'; buf[8] = 'e'; buf[9] = ',';
  buf[10] = data + 48;
  
  radio.powerUp();
  radio.write(buf, BLOCK_SIZE);
  radio.powerDown();
}

void enterSleep() {
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  //TODO: figure out how to power down timer 0 and SPI without killing radio communication
  //PRR |= (1<<PRTIM1) | (1<<PRTIM2) | (1<<PRSPI); //Power down 2 timers - saves about 0.24 mA; NOTE: power-down-sleep seems to do this on its own
  sleep_enable();
  //sleep_mode(); //could handle interrupt with ISR(WDT_vect) { ... }
  sleep_cpu();
  sleep_disable();
  //PRR &= ~((1<<PRTIM1) | (1<<PRTIM2) | (1<<PRSPI)); //Power up the timers
  //power_all_enable();
}
void buttonPushed() {
  
}

void setup() {
  pinMode(2, INPUT_PULLUP);
  attachInterrupt(0, buttonPushed, CHANGE); //Interrupt on pin 2
  
  //Configure watchdog timer (WDT) (see donalmorrissey.blogspot.com/2010/04/sleeping-arduino-part-5-wake-up-via.html)
  //MCUSR &= ~(1<<WDRF); //Clear the reset flag
  //WDTCSR |= (1<<WDCE) | (1<<WDE); //Allow changing WDT prescaler
  //WDTCSR = 1<<WDP0 | 1<<WDP3; //8 seconds
  //WDTCSR = 1<<WDP0 | 1<<WDP1 | 1<<WDP2; //2 seconds
  //WDTCSR |= _BV(WDIE); //Enable WDT interrupt (no reset)
  
  //Power down some perhipials (see https://www.avrprogrammers.com/howto/atmega328-power)
  PRR |= (1<<PRTWI) | (1<<PRUSART0) | (1<<PRADC); //TWI, UART, and ADC, saving an estimated 0.49 mA of power
  
  //Init radio
  radio.begin();
  radio.openWritingPipe(WRITE_ADDR | pipeMask);
  //don't enable dynamic payloads - all payloads will be 32 bytes
  radio.setAutoAck(true);
  radio.powerDown();
  //don't listen

  sendData();
}

void loop() {
  enterSleep();
  cli();
  delay(25);
  sendData();
  sei();
}
