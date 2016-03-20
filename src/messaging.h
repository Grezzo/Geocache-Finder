#pragma once

#include <pebble.h>
#include <stdint.h>

typedef enum {
  AppKeyReady = 0,
  AppKeyGetGeocaches,
  AppKeyGeocacheList,
  AppKeyGetCacheDetails,
  AppKeyGetSettings,
  AppKeyUsername,
  AppKeyShowPremium,
  AppKeyShowFound,
  AppKeySetShowPremium,
  AppKeySetShowFound,
  AppKeyDistance,
  AppKeyBearing,
  AppKeyStopLocationUpdates,
} AppKey;

void inbox_received_handler(DictionaryIterator *iter, void *context);

void send_message(const uint32_t key);
void send_message_with_int(const uint32_t key, int value);
void send_message_with_string(const uint32_t key, const char *const string);
