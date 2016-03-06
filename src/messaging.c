#include <pebble.h>
#include "messaging.h"

void send_message(const uint32_t key) {
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  const int dummy_val = 1;
  dict_write_int(iter, key, &dummy_val, sizeof(int), true);
  dict_write_end(iter);
  app_message_outbox_send();
}