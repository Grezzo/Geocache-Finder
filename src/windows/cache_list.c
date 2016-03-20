#include <pebble.h>
#include "cache_list.h"
#include "geocache.h"
#include "windows/cache_details.h"
#include "windows/home.h"

static Geocache s_geocaches[20];
//search results windw
static Window *s_menu_window;
static MenuLayer *s_menu_layer;






//------------------------------------------
//---------------Menu Window----------------
//------------------------------------------

static void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  // Use the row to specify which item will receive the select action
  int row = cell_index->row;
  APP_LOG(APP_LOG_LEVEL_DEBUG, "%s selected", s_geocaches[row].geocode);
  show_cache_details(s_geocaches[cell_index->row].geocode);
}

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  // JS always sends 20
  return 20;
}

static void menu_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  int row = cell_index->row;
  char *title = s_geocaches[row].name;
  char subtitle[20];
  snprintf(subtitle, 20, "%s - %s", s_geocaches[row].geocode, s_geocaches[row].distance);
  if (menu_cell_layer_is_highlighted(cell_layer)) {
    graphics_context_set_text_color(ctx, GColorWhite);
  } else {
    graphics_context_set_text_color(ctx, GColorBlack);
  }
  GRect bounds = layer_get_bounds(cell_layer);
  GRect title_box = GRect(3, 0, bounds.size.w - 6, bounds.size.h);
  graphics_draw_text(ctx, title, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), title_box, GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  GRect subtitle_box = GRect(3, bounds.size.h - 19 , bounds.size.w - 6, 19);
  graphics_draw_text(ctx, subtitle, fonts_get_system_font(FONT_KEY_GOTHIC_14), subtitle_box, GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
}

static int16_t menu_get_cell_height(MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context) {
  int row = cell_index->row;
  char *title = s_geocaches[row].name;

  GRect bounds = layer_get_bounds(menu_layer_get_layer(menu_layer));
  GRect title_box = GRect(3, 0, bounds.size.w - 6, 100);
  GSize text_size = graphics_text_layout_get_content_size(title, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), title_box, GTextOverflowModeWordWrap, GTextAlignmentLeft);
  return text_size.h + 19;
}

static void menu_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  s_menu_layer = menu_layer_create(bounds);
  
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
    .get_num_rows = menu_get_num_rows_callback,
    .draw_row = menu_draw_row_callback,
    .select_click = menu_select_callback,
    .get_cell_height = menu_get_cell_height,
  });

  // Bind the menu layer's click config provider to the window for interactivity
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void menu_window_unload(Window *window) {
  // Destroy MenuLayer
  menu_layer_destroy(s_menu_layer);
  window_destroy(s_menu_window);

}

void cache_list_init() {
  // Create menu Window element and assign to pointer
  s_menu_window = window_create();
  
  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_menu_window, (WindowHandlers) {
    .load = menu_window_load,
    .unload = menu_window_unload
  });

  // Show the Window on the watch, with animated=true
  window_stack_push(s_menu_window, true);
  //Turn on light in case it too so long to get results that it had gone dark
  light_enable_interaction();
  //Vibrate to indicate that results are ready in case it took ages
  vibes_short_pulse();
  update_home_status_text("");
}

//splits a string at a delimiter. Returns first token and advances source pointer to start of next token
char * getToken(char **source, char delim) {
  //Set token to start of string
  char *token = *source;
  //Skip original string forwards to delim
  while (**source != delim && **source != 0) ++*source;
  //Replace delim with null so token stops there
  **source = '\0';
  //Advance original string past null to beginning of next token
  ++*source;
  //return token
  return token;
}

void geocacheListToArray(char * list) {
  // There are always 20 geocaches sent from JS
  for (int i = 0; i < 20; i++) {
    char * geocache = getToken(&list, (char)30);
    char *geocode = getToken(&geocache, (char)31);
    char *name = getToken(&geocache, (char)31);
    char *distance = geocache;    
    s_geocaches[i] = (Geocache){
      .geocode = geocode,
      .name = name,
      .distance = distance,
    };
  }
}
