#include "messaging.h"
#include "windows/home.h"

int main(void) {
  // Register callback for app messaging
  app_message_register_inbox_received(inbox_received_handler);
  app_message_open(1000, 100);
  
  // Show home window
  home_window_init();
  app_event_loop();
  home_window_deinit();
}

/*
TODO:
 - say when getting location before saying when getting geocaches
 - detect connection to phone going away
 - shrink message buffers and coords string array size (possibly?)
 - hide actionbar icons until phone connected
 - show status bar on every window (so time and battery level can be seen)
 - make unusable unless credentials saved
 - display message if unable to log in
*/