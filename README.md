# **Express API Handler**  
Generate fully-documented route handlers with type-safe request and response handling.

<!-- [![npm version](https://img.shields.io/npm/v/merl.svg)](https://www.npmjs.com/package/express-route-handler)  
[![Downloads](https://img.shields.io/npm/dt/express-route-handler.svg)](https://www.npmjs.com/package/express-route-handler)   -->

## **Overview**  
`express-route-handler` is a lightweight node-express utility that allows you to define fully-documented type-safe endpoints with request & response validation.

---
<!-- 
## **Features**  
- 🛠 **Type-Safe URL Generation**: Compile-time safety for dynamic and query parameters.  
- 🚀 **Simple API**: Easy-to-use chaining for building nested routes.  
- ⚡ **Lightweight and Fast**: Minimal overhead for modern web applications.  
- 🔒 **Error Prevention**: Guards against invalid routes or missing parameters.  

--- -->

## **Installation**

Install `express-route-handler` via npm or yarn:

```bash
npm install express-route-handler
```

or

```bash
yarn add express-route-handler
```

---

<!-- ## **Usage**  

### **Step 1: Define Your URL Patterns**

```typescript
import merl from 'merl';

// Declare all your routes
const urls = [
  'products/:productId/reviews/:reviewId',
  'categories/:categoryId/items',
  '/about',
  '/search',
] as const;

// Compile URL patterns
const pathBuilder = merl.compile(urls);
```

### **Step 2: Generate Dynamic URLs**

```typescript
// Example: Product Review URL
const productReviewUrl = pathBuilder.products
  .using('42') // Replace :productId with '42'
  .reviews.using('7') // Replace :reviewId with '7'
  .url();

console.log(productReviewUrl); // Output: /products/42/reviews/7
```

### **Step 3: Add Query Parameters**

```typescript
const categoryItemsUrl = pathBuilder.categories
  .using('electronics') // Replace :categoryId with 'electronics'
  .items.url({ sort: 'asc', page: 2 });

console.log(categoryItemsUrl); // Output: /categories/electronics/items?sort=asc&page=2
```

### **Step 4: Access Static URLs**

```typescript
const aboutUrl = pathBuilder.about.url();
console.log(aboutUrl); // Output: /about

const searchUrl = pathBuilder.search.url({ q: 'laptops' });
console.log(searchUrl); // Output: /search?q=laptops
```

---

## **Advanced Usage**  

### **Nested Routes**
Chain `.using()` calls to handle deeply nested routes.

```typescript
const nestedUrl = pathBuilder.products
  .using('99')
  .reviews.using('12')
  .url({ highlight: true });

console.log(nestedUrl); // Output: /products/99/reviews/12?highlight=true
```

### **Error Handling**
`merl` prevents incorrect usage at compile-time in TypeScript.

```typescript
// TypeScript error: Missing :productId
// const invalidUrl = pathBuilder.products.url();

// Correct usage:
const validUrl = pathBuilder.products.using('10').reviews.using('5').url();
console.log(validUrl); // Output: /products/10/reviews/5
```

---

## **API Reference**  

### **`m.compile(routes: readonly string[])`**  
Compiles a list of URL patterns into a type-safe `pathBuilder` object.

- **`routes`**: An array of URL strings (e.g., `'path/:dynamicSegment'`).

### **Dynamic Segments**
Use `.using(value)` to replace dynamic segments (e.g., `:productId`).

### **Query Parameters**
Add query parameters with `.url(query)`:
- **`query`**: An object where keys are parameter names and values are strings or numbers.

---

## **Why Merl?**

- 🚦 **Eliminates Runtime Errors**: Type-checking ensures your URLs are always valid.  
- 📚 **Readable Code**: Focus on route logic instead of manual string concatenation.  
- 🧹 **Maintainability**: Centralize your route definitions in a single place.  

--- -->

## **License**  

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## **Links**  

- [NPM Package](https://www.npmjs.com/package/express-route-handler)  
- [GitHub Repository](https://github.com/GeniusChinez/express-route-handler)  
- [Issues](https://github.com/GeniusChinez/express-route-handler/issues)