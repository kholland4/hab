void sendUpdate() {
  Serial.print("1,0,state,"); Serial.print(!digitalRead(2)); Serial.write(0);
}

void buttonISR() {
  bool state = digitalRead(2);
  delay(10);
  if(digitalRead(2) == state) {
    sendUpdate();
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(2), buttonISR, CHANGE);
}

void loop() {
  sendUpdate();
  delay(1000);
}
