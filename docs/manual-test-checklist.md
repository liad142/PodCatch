# Manual Test Checklist

This document provides a comprehensive manual QA checklist for the PodCatch Spotify Discovery feature.

## How to Use This Checklist

1. Before testing, ensure the development server is running (`npm run dev`)
2. Clear browser cache and local storage for a clean test
3. Mark each item as:
   - [x] Passed
   - [-] Failed (add notes)
   - [~] Partial (add notes)
   - [ ] Not tested

## Pre-Test Setup

- [ ] Environment variables are configured (.env.local)
- [ ] Spotify API credentials are valid
- [ ] Development server is running
- [ ] Browser developer tools are open (Network tab)

---

## Browse Page

### Categories Carousel

- [ ] Categories carousel loads on page load
- [ ] Categories display with correct images
- [ ] Categories display with correct names
- [ ] Carousel scrolls left when left arrow is clicked
- [ ] Carousel scrolls right when right arrow is clicked
- [ ] Smooth scrolling animation works
- [ ] Touch swipe works on mobile devices
- [ ] Category cards are clickable
- [ ] Clicking a category navigates to category page
- [ ] Loading skeleton shows while fetching data
- [ ] Error message shows if categories fail to load

### Top Podcasts Carousel

- [ ] Top Podcasts carousel loads on page load
- [ ] Shows correct country flag/name indicator
- [ ] Podcast cards show title, publisher, and image
- [ ] Carousel scrolls left and right properly
- [ ] "See All" link is visible
- [ ] "See All" link navigates to full list
- [ ] Clicking a podcast card navigates to show page

### Category Carousels (Lazy Loading)

- [ ] Category carousels load when scrolled into view
- [ ] Each category carousel shows relevant podcasts
- [ ] Loading indicator shows while fetching
- [ ] Carousels don't reload when scrolling back up
- [ ] Multiple category carousels can be visible at once
- [ ] Performance is acceptable with many carousels

### Country Selector

- [ ] Country selector dropdown is visible
- [ ] Dropdown shows available countries
- [ ] Selecting a country updates Top Podcasts carousel
- [ ] Selecting a country updates category content
- [ ] Selected country persists after page refresh (localStorage)
- [ ] Country flag/icon displays correctly
- [ ] Default country is US if not previously selected

### See All Links

- [ ] "See All" link appears on each carousel
- [ ] "See All" link for categories works
- [ ] "See All" link for Top Podcasts works
- [ ] "See All" link for each category carousel works
- [ ] Link styling indicates it's clickable

---

## Category Page

### Grid Display

- [ ] Category name displays as page title
- [ ] Podcasts display in a grid layout
- [ ] Grid is responsive (adjusts columns based on screen size)
- [ ] Podcast cards show all required information
- [ ] Images load properly
- [ ] Placeholder shows for missing images

### Infinite Scroll

- [ ] Initial batch of podcasts loads
- [ ] Scrolling to bottom triggers loading more
- [ ] Loading indicator shows when fetching more
- [ ] New podcasts append to existing list
- [ ] "No more podcasts" message shows when exhausted
- [ ] Duplicate podcasts are not shown
- [ ] Scroll position is maintained when loading more

### Navigation

- [ ] Back button returns to browse page
- [ ] Browser back button works correctly
- [ ] Page title updates in browser tab
- [ ] URL includes category ID
- [ ] Direct URL access works

---

## Show Page

### Show Details

- [ ] Show image displays (large size)
- [ ] Show title displays correctly
- [ ] Publisher name displays
- [ ] Show description displays
- [ ] Episode count displays
- [ ] Explicit badge shows if applicable
- [ ] Language information displays

### Episodes List

- [ ] Episodes list loads below show details
- [ ] Episodes show title and description
- [ ] Episodes show release date
- [ ] Episodes show duration
- [ ] Episode images display (if available)

### Infinite Scroll for Episodes

- [ ] Initial batch of episodes loads
- [ ] Scrolling loads more episodes
- [ ] Loading indicator shows while fetching
- [ ] Episodes append correctly
- [ ] "No more episodes" message shows when exhausted
- [ ] Oldest episodes load last

### Listen on Spotify Button

- [ ] "Listen on Spotify" button is visible
- [ ] Button has Spotify branding/colors
- [ ] Clicking button opens Spotify in new tab
- [ ] URL is correct (open.spotify.com/show/...)
- [ ] Button works on mobile devices

---

## Search

### Search Input

- [ ] Search bar is visible in header
- [ ] Placeholder text is shown
- [ ] Search icon is displayed
- [ ] Input is focused when clicked
- [ ] Clear button appears when text is entered
- [ ] Clear button clears the input

### Debounce Behavior

- [ ] Typing doesn't trigger immediate API calls
- [ ] API call triggers after typing stops (~300ms)
- [ ] Network tab shows single request, not multiple
- [ ] Loading indicator shows during debounce
- [ ] Fast typing doesn't cause multiple requests

### Results Dropdown

- [ ] Results dropdown appears after search
- [ ] Results show podcast name and publisher
- [ ] Results show podcast image
- [ ] Results are clickable
- [ ] Clicking result navigates to show page
- [ ] Dropdown closes after selection
- [ ] Dropdown closes when clicking outside
- [ ] Keyboard navigation works (arrow keys)
- [ ] Enter key selects focused result
- [ ] Escape key closes dropdown

### Empty State

- [ ] "No results found" shows for no matches
- [ ] Suggestion to try different keywords appears
- [ ] Empty state is styled appropriately
- [ ] Minimum character requirement message (if applicable)

---

## Edge Cases

### No Network / Offline

- [ ] Error state shows when offline
- [ ] Error message is user-friendly
- [ ] Retry button is available
- [ ] Previously loaded content remains visible
- [ ] App doesn't crash
- [ ] Network restored: content loads on retry

### Slow Network (3G Simulation)

- [ ] Loading states persist appropriately
- [ ] Timeouts are handled gracefully
- [ ] User can navigate while content loads
- [ ] Progress indicators are visible
- [ ] Images load progressively (if lazy loaded)

### Empty Category

- [ ] Empty state shows if category has no podcasts
- [ ] Message is clear and helpful
- [ ] Back button is accessible
- [ ] No broken layout

### Very Long Content

- [ ] Long podcast titles truncate with ellipsis
- [ ] Long descriptions truncate appropriately
- [ ] Long publisher names are handled
- [ ] Layout doesn't break with long content
- [ ] Tooltip or expansion available for truncated text

### Missing Data

- [ ] Shows without images show placeholder
- [ ] Shows without description display gracefully
- [ ] Missing episode duration shows "Duration N/A"
- [ ] Missing release date handled appropriately

### Rate Limiting

- [ ] Rate limit error is caught and displayed
- [ ] Retry-After timing is respected
- [ ] User is informed to wait
- [ ] App doesn't make repeated failing requests

---

## Cross-Browser Testing

### Desktop Browsers

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Browse page loads | [ ] | [ ] | [ ] | [ ] |
| Carousels scroll | [ ] | [ ] | [ ] | [ ] |
| Search works | [ ] | [ ] | [ ] | [ ] |
| Navigation works | [ ] | [ ] | [ ] | [ ] |
| Images load | [ ] | [ ] | [ ] | [ ] |
| Animations smooth | [ ] | [ ] | [ ] | [ ] |

### Mobile Browsers

| Feature | Mobile Safari | Mobile Chrome | Samsung Internet |
|---------|---------------|---------------|------------------|
| Browse page loads | [ ] | [ ] | [ ] |
| Touch scrolling | [ ] | [ ] | [ ] |
| Search input works | [ ] | [ ] | [ ] |
| Keyboard doesn't overlap | [ ] | [ ] | [ ] |
| Links are tap-friendly | [ ] | [ ] | [ ] |
| No horizontal scroll | [ ] | [ ] | [ ] |

---

## Responsive Design

### Desktop (1920x1080)

- [ ] Full layout displays correctly
- [ ] Carousels show many items
- [ ] Grid shows 4-5 columns
- [ ] All content is readable

### Laptop (1366x768)

- [ ] Layout adjusts appropriately
- [ ] No horizontal overflow
- [ ] Carousels are usable
- [ ] Grid shows 3-4 columns

### Tablet (768x1024)

- [ ] Layout is tablet-friendly
- [ ] Touch interactions work
- [ ] Grid shows 2-3 columns
- [ ] Navigation is accessible

### Mobile (375x667)

- [ ] Single column layout
- [ ] Search bar is accessible
- [ ] Touch targets are large enough (44px minimum)
- [ ] No content is cut off
- [ ] Scrolling is smooth
- [ ] Bottom navigation (if any) doesn't overlap content

---

## Performance Checks

- [ ] Initial page load < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] No layout shifts after load (CLS)
- [ ] Images are optimized
- [ ] Lazy loading works for off-screen content
- [ ] No memory leaks (check DevTools Memory)
- [ ] API response times < 500ms (check Network tab)

---

## Accessibility Checks

- [ ] Tab navigation works throughout
- [ ] Focus indicators are visible
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA
- [ ] Images have alt text
- [ ] Buttons have accessible names
- [ ] No keyboard traps

---

## Notes Section

Use this section to document any issues found:

### Issues Found

| ID | Description | Severity | Page/Component | Steps to Reproduce |
|----|-------------|----------|----------------|-------------------|
| | | | | |
| | | | | |
| | | | | |

### Environment Details

- **Browser:**
- **OS:**
- **Screen Resolution:**
- **Network Speed:**
- **Date Tested:**
- **Tester:**

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Tester | | | |
| Developer | | | |
| Product Owner | | | |
