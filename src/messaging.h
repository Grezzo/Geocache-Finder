#pragma once
#include <stdint.h>

typedef enum {
  AppKeyReady = 0,
  AppKeyGetGeocaches,
  AppKeyGeocacheList,
  AppKeyGetCacheDetails,
} AppKey;

void send_message(const uint32_t key);
void send_message_with_string(const uint32_t key, const char *const string);
