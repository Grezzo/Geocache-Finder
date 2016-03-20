#include "settings.h"
#include "messaging.h"

static Window *s_main_window;

static TextLayer *s_text_layer;

static MenuLayer *s_menu_layer;

static GBitmap *s_tick_black_bitmap;
static GBitmap *s_tick_white_bitmap;

static char text[40];

static bool s_selections[2];


static uint16_t get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *context) {
  return 2;
}

static void draw_row_callback(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *context) {
  // Choice item
  switch (cell_index->row) {
    case 0:
      menu_cell_basic_draw(ctx, cell_layer, "Show Premium", NULL, NULL);
      break;
    case 1:
      menu_cell_basic_draw(ctx, cell_layer, "Show Found", NULL, NULL);
      break;
  }
  
  // Selected?
  GBitmap *ptr = s_tick_black_bitmap;
  if(menu_cell_layer_is_highlighted(cell_layer)) {
    graphics_context_set_stroke_color(ctx, GColorWhite);
    ptr = s_tick_white_bitmap;
  }

  GRect bounds = layer_get_bounds(cell_layer);
  GRect bitmap_bounds = gbitmap_get_bounds(ptr);
  
  // Draw checkbox
  GRect r = GRect(
    bounds.size.w - (2 * CHECKBOX_WINDOW_BOX_SIZE),
    (bounds.size.h / 2) - (CHECKBOX_WINDOW_BOX_SIZE / 2),
    CHECKBOX_WINDOW_BOX_SIZE,
    CHECKBOX_WINDOW_BOX_SIZE);
  graphics_draw_rect(ctx, r);
  
  // Draw Tick
  if(s_selections[cell_index->row]) {
    graphics_context_set_compositing_mode(ctx, GCompOpSet);
    graphics_draw_bitmap_in_rect(ctx, ptr, GRect(r.origin.x, r.origin.y - 3, bitmap_bounds.size.w, bitmap_bounds.size.h));
  }
}

static void select_callback(struct MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context) {
  // Check/uncheck
  int row = cell_index->row;
  s_selections[row] = !s_selections[row];
  menu_layer_reload_data(menu_layer);
  //Send settings to javascript
  send_message_with_int(row == 0 ? AppKeySetShowPremium : AppKeySetShowFound, s_selections[row]);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  
  s_text_layer = text_layer_create(GRect(0, 0, bounds.size.w, 19));
  text_layer_set_text(s_text_layer, text);
  text_layer_set_text_alignment(s_text_layer, GTextAlignmentCenter);
  text_layer_set_font(s_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  layer_add_child(window_layer, text_layer_get_layer(s_text_layer));
  
  s_tick_black_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_TICK_BLACK);
  s_tick_white_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_TICK_WHITE);
  
  s_menu_layer = menu_layer_create(GRect(0, 19, bounds.size.w, bounds.size.h - 19));
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks) {
      .get_num_rows = get_num_rows_callback,
      .draw_row = draw_row_callback,
      .select_click = select_callback,
  });
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(s_text_layer);
  menu_layer_destroy(s_menu_layer);
  gbitmap_destroy(s_tick_black_bitmap);
  gbitmap_destroy(s_tick_white_bitmap);
  window_destroy(window);
}

void show_settings_window(char* username, bool show_premium, bool show_found) {
  snprintf(text, 30, "User: %s", username);
  s_selections[0] = show_premium;
  s_selections[1] = show_found;
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(s_main_window, true);
}