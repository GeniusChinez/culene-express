/* eslint-disable @typescript-eslint/no-explicit-any */

export function generateHtmlFromOpenAPISpec(endpointSpec: any): string {
  if (!endpointSpec || Object.keys(endpointSpec).length === 0) {
    return `<html><body><h1>No API Spec Found</h1></body></html>`;
  }

  const { path, methods, spec } = endpointSpec;

  if (!path || !methods || !spec) {
    return `<html><body><h1>Invalid API Spec</h1></body></html>`;
  }

  let html = `<html><head><style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      margin: 20px;
      color: #333;
      background-color: #f9f9f9;
    }
    h1, h2, h3 {
      color: #222;
    }
    .container {
      max-width: 1200px;
      margin: auto;
      padding: 20px;
      background: #fff;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    .badge {
      text-transform: uppercase;
      color: #fff;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      margin-right: 5px;
      display: inline-block;
    }
    .get {
      background-color: #4CAF50;
    }
    .post {
      background-color: #007BFF;
    }
    .put {
      background-color: #FFC107;
    }
    .delete {
      background-color: #F44336;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border: 1px solid #ddd;
    }
    th {
      background-color: #f4f4f4;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    code {
      background: #f4f4f4;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 14px;
      color: #d63384;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 8px;
      font-size: 14px;
      overflow-x: auto;
    }
    .summary, .responses {
      margin-top: 30px;
    }
  </style></head><body>`;

  html += `<div class="container">`;

  // Header with API Endpoint
  html += `<h1>API Endpoint: <code>${path}</code></h1>`;
  html += `<div>Methods: ${methods
    .map(
      (method: string) =>
        `<span class="badge ${method.toLowerCase()}">${method}</span>`,
    )
    .join("")}</div>`;

  // Summary Section
  html += `<div class="summary"><h2>Summary</h2>`;
  html += `<p>${spec.summary || "No summary provided"}</p></div>`;

  // Parameters Table
  if (spec.parameters && spec.parameters.length > 0) {
    html += `<div class="parameters"><h2>Parameters</h2>`;
    html += `<table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Location</th>
          <th>Description</th>
          <th>Required</th>
          <th>Schema</th>
        </tr>
      </thead>
      <tbody>`;

    spec.parameters.forEach((param: any) => {
      html += `<tr>
        <td>${param.name}</td>
        <td>${param.in}</td>
        <td>${param.description || "No description provided"}</td>
        <td>${param.required ? "Yes" : "No"}</td>
        <td><code>${JSON.stringify(param.schema, null, 2)}</code></td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  }

  // Responses Section
  if (spec.responses) {
    html += `<div class="responses"><h2>Responses</h2>`;
    Object.entries(spec.responses).forEach(([status, response]: any) => {
      html += `<h3>Status Code: ${status}</h3>`;
      html += `<p>${response.description || "No description provided"}</p>`;

      if (response.content) {
        Object.entries(response.content).forEach(
          ([contentType, contentSpec]: any) => {
            html += `<h4>Content Type: ${contentType}</h4>`;
            html += `<pre>${JSON.stringify(contentSpec.schema, null, 2)}</pre>`;
          },
        );
      }
    });
    html += `</div>`;
  }

  html += `</div></body></html>`;
  return html;
}
