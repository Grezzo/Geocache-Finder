#include <pebble.h>
#include "messaging.h"

void send_message(const uint32_t key) {
  send_message_with_int(key, 1);
}

void send_message_with_int(const uint32_t key, int value) {
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  dict_write_int(iter, key, &value, sizeof(int), true);
  dict_write_end(iter);
  app_message_outbox_send();
}

void send_message_with_string(const uint32_t key, const char *const string) {
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  dict_write_cstring(iter, key, string);
  dict_write_end(iter);
  app_message_outbox_send();
}