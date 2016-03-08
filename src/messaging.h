#pragma once
#include <stdint.h>

typedef enum {
  AppKeyReady = 0,
  AppKeyGetGeocaches,
  AppKeyGeocacheList,
  AppKeyGetCacheDetails,
  AppKeyCoords,
  AppKeyGetSettings,
  AppKeyUsername,
  AppKeyShowPremium,
  AppKeyShowFound,
  AppKeySetShowPremium,
  AppKeySetShowFound,
} AppKey;

void send_message(const uint32_t key);
void send_message_with_int(const uint32_t key, int value);
void send_message_with_string(const uint32_t key, const char *const string);
