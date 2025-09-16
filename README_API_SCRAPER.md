# Nadlan Deals API Scraper

A Node.js script to collect deals data from the Nadlan API endpoint with automatic gzip/base64 decoding.

## API Endpoint

- **URL**: `https://x4006fhmy5.execute-api.il-central-1.amazonaws.com/api/deal`
- **Method**: POST
- **Parameter**: `fetch_number` (currently set to "PLACE_HOLDER")

## Features

- ✅ Automatic gzip decompression and base64 decoding
- ✅ Proper error handling and logging
- ✅ Response data structure analysis
- ✅ Automatic file saving with timestamps
- ✅ Support for custom parameter values
- ✅ Built-in test functions

## Files Created

1. **`nadlan_deals_api_scraper.js`** - Main scraper class
2. **`example_usage.js`** - Usage examples and demonstrations
3. **`README_API_SCRAPER.md`** - This documentation

## Usage

### Basic Usage

```bash
# Test with placeholder parameter
node nadlan_deals_api_scraper.js

# Run usage examples
node example_usage.js
```

### Programmatic Usage

```javascript
const NadlanDealsAPIScraper = require("./nadlan_deals_api_scraper.js");

const scraper = new NadlanDealsAPIScraper();

// Test with placeholder
const result = await scraper.testWithPlaceholder();

// Test with custom parameter
const customResult = await scraper.testWithCustomParameter(
  "your_parameter_value"
);

// Direct API call
const directResult = await scraper.fetchDealsData("your_parameter_value");
```

## Response Structure

The API returns data in the following format:

```json
{
  "statusCode": 200,
  "data": {
    "total_rows": 0,
    "total_fetch": 0,
    "total_page": 0,
    "items": []
  }
}
```

## Current Status

- ✅ API endpoint is accessible
- ✅ Parameter name identified: `fetch_number`
- ✅ Response format confirmed
- ✅ Gzip/base64 decoding implemented
- ⏳ Waiting for actual parameter value to replace "PLACE_HOLDER"

## Next Steps

1. Replace `"PLACE_HOLDER"` with the actual parameter value when provided
2. Test with real data to verify the gzip/base64 decoding works with actual compressed responses
3. Implement data processing and CSV export if needed

## Error Handling

The script handles various scenarios:

- Network errors
- Invalid JSON responses
- Gzip decompression failures
- Base64 decoding errors
- File I/O errors

All errors are logged with descriptive messages and the script continues execution where possible.


