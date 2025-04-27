document.addEventListener("DOMContentLoaded", function () {
    const apiDescription = document.getElementById("api-description");
    const categoryChips = document.getElementById("category-chips");
    const endpointsContainer = document.getElementById("endpoints-container");
    const searchInput = document.getElementById("search-input");
    const copyBaseUrlBtn = document.querySelector(".copy-base-url-btn");
    const baseUrlElement = document.querySelector(".base-url-container .text-primary");

    loadSwaggerDoc()
        .then(apiData => {
            if (apiDescription && apiData.description) {
                apiDescription.innerHTML = marked.parse(apiData.description);
            }
            
            initCategoryTabs(apiData.categories);
            renderEndpoints(apiData.categories[0].endpoints);

            setupSearch(apiData);
        })
        .catch(error => {
            console.error("Error loading Swagger doc:", error);
            endpointsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-triangle fa-3x mb-4 text-error"></i>
                    <h3 class="text-xl font-semibold mb-2">Error Loading API Data</h3>
                    <p class="text-text-secondary">Could not load API documentation. Please try again later.</p>
                </div>
            `;
        });

    if (copyBaseUrlBtn) {
        copyBaseUrlBtn.addEventListener("click", function () {
            const baseUrl = this.getAttribute("data-text");
            navigator.clipboard.writeText(baseUrl).then(() => {
                const originalHTML = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i>';
                this.classList.add("copied");

                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.classList.remove("copied");
                }, 2000);
            });
        });
    }

    document.addEventListener("click", function (e) {
        if (
            e.target.closest(".copy-btn") ||
            e.target.closest(".code-copy-btn") ||
            e.target.closest(".copy-response-btn") ||
            e.target.closest(".copy-curl-btn")
        ) {
            const btn =
                e.target.closest(".copy-btn") ||
                e.target.closest(".code-copy-btn") ||
                e.target.closest(".copy-response-btn") ||
                e.target.closest(".copy-curl-btn");

            const textToCopy =
                btn.dataset.text ||
                document.querySelector(`.${btn.dataset.target}`)?.textContent ||
                btn
                    .closest(".code-block-container")
                    ?.querySelector(".code-block")?.textContent ||
                btn
                    .closest(".code-editor-container")
                    ?.querySelector(".code-editor")?.textContent ||
                "";

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.classList.add("copied");

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove("copied");
                }, 2000);
            });
        }
    });

    document.addEventListener("click", function (e) {
        if (e.target.closest(".tab-btn")) {
            const btn = e.target.closest(".tab-btn");
            const tabsContainer = btn.closest(".tabs-header");
            const tabsContentContainer = btn
                .closest(".endpoint-tabs")
                .querySelector(".tabs-content");
            const tabName = btn.getAttribute("data-tab");

            tabsContainer
                .querySelectorAll(".tab-btn")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const tabPanes = tabsContentContainer.querySelectorAll(".tab-pane");
            tabPanes.forEach(pane => {
                pane.classList.remove("active");
                if (pane.id === tabName) {
                    pane.classList.add("active");
                }
            });
        }
    });

    document.addEventListener("click", function (e) {
        if (e.target.closest(".endpoint-toggle-btn")) {
            const btn = e.target.closest(".endpoint-toggle-btn");
            const card = btn.closest(".endpoint-card");
            const content = card.querySelector(".endpoint-content");

            card.classList.toggle("expanded");

            if (card.classList.contains("expanded")) {
                content.style.display = "block";

                if (content.dataset.loaded === "false") {
                    loadEndpointContent(card, content);
                }
            } else {
                content.style.display = "none";
            }
        }
    });

    document.addEventListener("click", function (e) {
        if (e.target.closest('[data-action="open-dialog"]')) {
            const btn = e.target.closest('[data-action="open-dialog"]');
            const inputContainer = btn.closest(".parameter-input-container");
            const input = inputContainer.querySelector(".parameter-input");

            if (input.dataset.hasDialog === "true") {
                const dialogType = input.dataset.dialogType;

                if (dialogType === "enum" && input.dataset.enum) {
                    const enumValues = JSON.parse(input.dataset.enum);
                    showSelectionDialog(input, enumValues, "enum");
                } else if (dialogType === "boolean") {
                    showSelectionDialog(input, null, "boolean");
                }
            }
        }
    });
    
    function updateBaseUrl(newUrl) {
        if (baseUrlElement) {
            baseUrlElement.textContent = newUrl;
            copyBaseUrlBtn.setAttribute("data-text", newUrl);
        }
    }

    function resolveSchemaRef(ref, swagger) {
        if (!ref || !ref.startsWith("#/")) {
            return null;
        }

        const path = ref.substring(2).split("/");
        let current = swagger;

        for (const segment of path) {
            if (!current || current[segment] === undefined) {
                return null;
            }
            current = current[segment];
        }

        return current;
    }

    async function loadSwaggerDoc() {
        const loadingOverlay = document.getElementById("loading-overlay");

        try {
            const swaggerUrl = "/swagger.json";

            const response = await fetch(swaggerUrl);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch Swagger doc: ${response.status} ${response.statusText}`
                );
            }
            const swaggerDoc = await response.json();
            window.swaggerDoc = swaggerDoc;
            updateBaseUrl(swaggerDoc.servers[0].url);
            const apiData = transformSwaggerToInternalFormat(
                swaggerDoc
            );

            window.apiData = apiData;

            loadingOverlay.classList.add("hidden");

            return apiData;
        } catch (error) {
            console.error("Error fetching Swagger doc:", error);

            const loadingContainer =
                loadingOverlay.querySelector(".loading-container");
            loadingContainer.innerHTML = `
            <i class="fas fa-exclamation-triangle fa-3x mb-4 text-error"></i>
            <h3 class="text-xl font-semibold mb-2">Error Loading API Data</h3>
            <p class="text-text-secondary">Could not load API documentation. Please try again later.</p>
            <button class="gradient-btn mt-4" onclick="location.reload()">
                <i class="fas fa-sync-alt mr-2"></i>Retry
            </button>
        `;

            throw error;
        }
    }

    function transformSwaggerToInternalFormat(swagger) {
        const fullSwagger = swagger;

        const categories = (swagger.tags || []).map(tag => ({
            name: tag.name,
            description: tag.description || "",
            icon: "fa-tag",
            endpoints: []
        }));

        if (categories.length === 0) {
            categories.push({
                name: "Default",
                description: "API Endpoints",
                icon: "fa-globe",
                endpoints: []
            });
        }

        for (const [path, pathItem] of Object.entries(swagger.paths)) {
            for (const [method, operation] of Object.entries(pathItem)) {
                if (method === "parameters") continue;

                const endpoint = {
                    path: path,
                    method: method.toUpperCase(),
                    summary: operation.summary || "",
                    description: operation.description || "",
                    parameters: [],
                    responses: [],
                    bodySchema: null,
                    swaggerVersion: swagger.swagger || swagger.openapi || "2.0"
                };

                if (operation.requestBody) {
                    const content = operation.requestBody.content || {};
                    const jsonContent = content["application/json"] || {};

                    if (jsonContent.schema) {
                        endpoint.bodySchema = jsonContent.schema;

                        endpoint.parameters.push({
                            name: "body",
                            in: "body",
                            type: "object",
                            required: operation.requestBody.required || false,
                            description:
                                operation.requestBody.description ||
                                "Request body",
                            schema: jsonContent.schema
                        });
                    }
                }

                const pathParams = pathItem.parameters || [];
                const operationParams = operation.parameters || [];
                const allParams = [...pathParams, ...operationParams];

                allParams.forEach(param => {
                    if (param.$ref) {
                        param =
                            resolveSchemaRef(param.$ref, fullSwagger) || param;
                    }

                    let paramSchema = param.schema || {};
                    let paramType = paramSchema.type || param.type || "string";

                    if (param.in === "body" && param.schema) {
                        endpoint.bodySchema = param.schema;
                    }

                    endpoint.parameters.push({
                        name: param.name,
                        in: param.in,
                        type: paramType,
                        required: param.required || false,
                        description: param.description || "",
                        enum: paramSchema.enum || param.enum,
                        example: param.example || paramSchema.example,
                        schema: param.schema
                    });
                });

                for (const [statusCode, response] of Object.entries(
                    operation.responses || {}
                )) {
                    let example = "{}";
                    let schema = response.schema;

                    if (
                        response.content &&
                        response.content["application/json"]
                    ) {
                        schema = response.content["application/json"].schema;
                    }

                    if (schema) {
                        const generatedExample = generateExampleFromSchema(
                            schema,
                            fullSwagger
                        );
                        example = JSON.stringify(generatedExample, null, 2);
                    }

                    endpoint.responses.push({
                        status: parseInt(statusCode, 10) || 200,
                        description: response.description || "",
                        example: example
                    });
                }

                const categoryName =
                    operation.tags && operation.tags.length > 0
                        ? operation.tags[0]
                        : "Default";

                const category =
                    categories.find(c => c.name === categoryName) ||
                    categories[0];
                category.endpoints.push(endpoint);
            }
        }

        return {
            description: swagger.info?.description || "",
            version: swagger.info?.version || "1.0.0",
            title: swagger.info?.title || "API Documentation",
            categories: categories,
            swaggerDoc: fullSwagger
        };
    }

    function setupSearch(apiData) {
        if (searchInput) {
            let debounceTimeout;
            searchInput.addEventListener("input", function () {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    const searchTerm = this.value.toLowerCase().trim();

                    if (searchTerm.length < 2) {
                        const activeTab = document.querySelector(
                            ".category-tab.active"
                        );
                        if (activeTab) {
                            const categoryIndex = parseInt(
                                activeTab.dataset.index
                            );
                            renderEndpoints(
                                apiData.categories[categoryIndex].endpoints
                            );
                        }
                        return;
                    }

                    const matchedEndpoints = [];

                    apiData.categories.forEach(category => {
                        category.endpoints.forEach(endpoint => {
                            if (
                                endpoint.path
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                endpoint.summary
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                endpoint.description
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                endpoint.parameters.some(
                                    p =>
                                        p.name
                                            .toLowerCase()
                                            .includes(searchTerm) ||
                                        p.description
                                            .toLowerCase()
                                            .includes(searchTerm)
                                )
                            ) {
                                matchedEndpoints.push(endpoint);
                            }
                        });
                    });

                    renderEndpoints(matchedEndpoints);
                }, 300);
            });
        }
    }

    function getCategoryIcon(categoryName) {
        const iconMap = {
            Test: "fa-gear"
        };

        return iconMap[categoryName] || "fa-tag"; // Default icon if category not found
    }

    function initCategoryTabs(categories) {
        categoryChips.innerHTML = "";

        categories.forEach((category, index) => {
            const tab = document.createElement("button");
            tab.className = `category-tab ${index === 0 ? "active" : ""}`;
            tab.dataset.index = index;

            const iconClass = getCategoryIcon(category.name);
            const iconStyle = iconClass.startsWith("fab") ? "fab" : "fas";
            tab.innerHTML = `
            <i class="${iconStyle} ${iconClass}"></i>
            ${category.name}
        `;

            tab.addEventListener("click", function () {
                document.querySelectorAll(".category-tab").forEach(c => {
                    c.classList.remove("active");
                });
                this.classList.add("active");

                renderEndpoints(categories[index].endpoints);

                if (searchInput) searchInput.value = "";
            });

            categoryChips.appendChild(tab);
        });
    }

    function loadEndpointContent(card, contentElement) {
        contentElement.innerHTML = `
        <div class="endpoint-content-loader">
            <div class="content-spinner"></div>
        </div>
    `;

        const path = card.dataset.path;
        const method = card.dataset.method;

        const endpoint = findEndpointByPathAndMethod(path, method);

        if (!endpoint) {
            contentElement.innerHTML =
                '<div class="p-4">Error loading endpoint details</div>';
            return;
        }

        setTimeout(() => {
            const contentHtml = createEndpointContent(endpoint);
            contentElement.innerHTML = contentHtml;

            setupEndpointContentHandlers(contentElement, endpoint);

            contentElement.dataset.loaded = "true";
        }, 300);
    }

    function findEndpointByPathAndMethod(path, method) {
        for (const category of window.apiData.categories) {
            const endpoint = category.endpoints.find(
                e => e.path === path && e.method === method
            );
            if (endpoint) return endpoint;
        }
        return null;
    }

    function createEndpointContent(endpoint) {
        return `
        <div class="endpoint-description mb-6">
            <div class="markdown-content">
                ${marked.parse(endpoint.description || "")}
            </div>
        </div>
        
        <div class="endpoint-tabs">
            <div class="tabs-header">
                <button class="tab-btn active" data-tab="documentation">Documentation</button>
                <button class="tab-btn" data-tab="try-it">Try It Out</button>
            </div>
            
            <div class="tabs-content">
                <div class="tab-pane active" id="documentation">
                    <div class="space-y-6">
                        <div class="parameters-section">
                            <h4 class="section-title">Parameters</h4>
                            <div class="parameters-table-container">
                                <table class="parameters-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Required</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody class="parameters-list">
                                        ${generateParametersTableHtml(
                                            endpoint.parameters
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="responses-section">
                            <h4 class="section-title">Responses</h4>
                            <div class="response-examples">
                                ${generateResponseExamplesHtml(
                                    endpoint.responses
                                )}
                            </div>
                        </div>
                        
                        <div class="code-example-section">
                            <h4 class="section-title">Code Example</h4>
                            <div class="code-block-container">
                                <pre class="code-block curl-example">${generateCurlCommand(
                                    endpoint
                                )}</pre>
                                <button class="code-copy-btn" data-target="curl-example">
                                    <i class="far fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-pane" id="try-it">
                    <div class="try-it-container">
                        <div class="swagger-try-it">
                            <div class="try-it-params">
                                <h4 class="section-title">Parameters</h4>
                                ${generateTryItParamsHtml(endpoint)}
                            </div>
                            
                            <div class="try-it-execute">
                                <button class="execute-btn">
                                    <i class="fas fa-play mr-2"></i>Execute
                                </button>
                            </div>
                            
                            <div class="try-it-response hidden">
                                <h4 class="section-title response-title">
                                    Server response
                                    <span class="response-status"></span>
                                    <span class="response-time"></span>
                                </h4>
                                
                                <div class="response-body">
                                    <h5 class="response-subtitle">Response body</h5>
                                    <div class="code-editor-container">
                                        <pre class="code-editor response-viewer"></pre>
                                        <button class="copy-response-btn">
                                            <i class="far fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="response-headers">
                                    <h5 class="response-subtitle">Response headers</h5>
                                    <div class="code-editor-container">
                                        <pre class="code-editor response-headers-viewer"></pre>
                                    </div>
                                </div>
                                
                                <div class="response-curl">
                                    <h5 class="response-subtitle">Curl</h5>
                                    <div class="code-editor-container">
                                        <pre class="code-editor response-curl-viewer"></pre>
                                        <button class="copy-curl-btn">
                                            <i class="far fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    }

    function generateParametersTableHtml(parameters) {
        if (!parameters || parameters.length === 0) {
            return '<tr><td colspan="4" style="text-align: center;">No parameters</td></tr>';
        }

        return parameters
            .map(
                param => `
        <tr>
            <td>${param.name}</td>
            <td>${param.type}</td>
            <td>${param.required ? "Yes" : "No"}</td>
            <td>${param.description}</td>
        </tr>
    `
            )
            .join("");
    }

    function generateResponseExamplesHtml(responses) {
        if (!responses || responses.length === 0) {
            return "<p>No response examples available.</p>";
        }

        return responses
            .map(response => {
                const statusClass =
                    response.status < 300
                        ? "success"
                        : response.status < 400
                        ? "warning"
                        : "error";

                return `
            <div class="response-example mb-4">
                <div class="response-example-header">
                    <div class="flex items-center">
                        <span class="response-status-badge ${statusClass}">${response.status}</span>
                        <span class="ml-2">${response.description}</span>
                    </div>
                </div>
                <div class="response-example-body">
                    <pre class="code-block">${response.example}</pre>
                </div>
            </div>
        `;
            })
            .join("");
    }

    function generateTryItParamsHtml(endpoint) {
        let html = "";

        if (endpoint.parameters && endpoint.parameters.length > 0) {
            const pathParams = endpoint.parameters.filter(p => p.in === "path");
            const queryParams = endpoint.parameters.filter(
                p => p.in === "query"
            );
            const bodyParams = endpoint.parameters.filter(p => p.in === "body");

            if (pathParams.length > 0) {
                html += `
                <div class="params-section mb-4">
                    <h5 class="params-section-title">Path Parameters</h5>
                    ${pathParams
                        .map(param => createParameterRowHtml(param, "path"))
                        .join("")}
                </div>
            `;
            }

            if (queryParams.length > 0) {
                html += `
                <div class="params-section mb-4">
                    <h5 class="params-section-title">Query Parameters</h5>
                    ${queryParams
                        .map(param => createParameterRowHtml(param, "query"))
                        .join("")}
                </div>
            `;
            }

            if (
                (bodyParams.length > 0 || endpoint.bodySchema) &&
                endpoint.method !== "GET"
            ) {
                html += `
                <div class="request-body-container mb-4">
                    <h5 class="params-section-title">Request Body</h5>
                    <div class="code-editor-container">
                        <pre class="code-editor request-body-editor" contenteditable="true">${generateJsonBody(
                            endpoint
                        )}</pre>
                        <button class="format-json-btn">
                            <i class="fas fa-code"></i>
                        </button>
                    </div>
                </div>
            `;
            }
        } else if (endpoint.bodySchema && endpoint.method !== "GET") {
            html += `
            <div class="request-body-container mb-4">
                <h5 class="params-section-title">Request Body</h5>
                <div class="code-editor-container">
                    <pre class="code-editor request-body-editor" contenteditable="true">${generateJsonBody(
                        endpoint
                    )}</pre>
                    <button class="format-json-btn">
                        <i class="fas fa-code"></i>
                    </button>
                </div>
            </div>
        `;
        } else {
            html += "<p>This endpoint does not require any parameters.</p>";
        }

        return html;
    }

    function createParameterRowHtml(param, paramType) {
        let inputHtml = "";

        if (param.enum) {
            inputHtml = `
            <div class="parameter-input-container">
                <input type="text" class="parameter-input" 
                       data-param="${param.name}" 
                       data-type="${param.type}" 
                       data-required="${param.required}" 
                       data-in="${paramType}"
                       data-has-dialog="true"
                       data-dialog-type="enum"
                       data-enum='${JSON.stringify(param.enum)}'
                       placeholder="Select a value"
                       ${param.required ? "required" : ""} readonly>
                <button type="button" class="input-select-btn" data-action="open-dialog">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        `;
        } else if (param.type === "boolean") {
            inputHtml = `
            <div class="parameter-input-container">
                <input type="text" class="parameter-input" 
                       data-param="${param.name}" 
                       data-type="${param.type}" 
                       data-required="${param.required}" 
                       data-in="${paramType}"
                       data-has-dialog="true"
                       data-dialog-type="boolean"
                       placeholder="Select true or false"
                       ${param.required ? "required" : ""} readonly>
                <button type="button" class="input-select-btn" data-action="open-dialog">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        `;
        } else {
            inputHtml = `
            <input type="text" class="parameter-input" 
                   data-param="${param.name}" 
                   data-type="${param.type}" 
                   data-required="${param.required}" 
                   data-in="${paramType}"
                   placeholder="${
                       param.type === "array"
                           ? '["item1", "item2"]'
                           : `Enter ${param.name}`
                   }"
                   ${param.required ? "required" : ""}>
        `;
        }

        return `
        <div class="parameter-row">
            <div class="parameter-header">
                <div class="parameter-name">
                    ${param.name}
                    ${
                        param.required
                            ? '<span class="parameter-required">*</span>'
                            : ""
                    }
                    <span class="parameter-type">${param.type}</span>
                </div>
            </div>
            <div class="parameter-body">
                <div class="parameter-description">${param.description}</div>
                ${inputHtml}
            </div>
        </div>
    `;
    }

    function showSelectionDialog(inputElement, options, dialogType) {
        const dialog = document.getElementById("selection-dialog");
        const dialogTitle = dialog.querySelector(".dialog-title");
        const dialogDescription = dialog.querySelector(".dialog-description");
        const dialogOptions = dialog.querySelector(".dialog-options");
        const confirmBtn = dialog.querySelector(".dialog-confirm-btn");

        let title, description;

        if (dialogType === "boolean") {
            title = "Select Boolean Value";
            description = "Choose between true or false";
            options = [
                {
                    value: "true",
                    label: "True",
                    description: "Boolean true value"
                },
                {
                    value: "false",
                    label: "False",
                    description: "Boolean false value"
                }
            ];
        } else if (dialogType === "enum") {
            title = "Select from Available Options";
            description = "Choose one of the available values";
            options = options.map(opt => ({
                value: opt,
                label: opt,
                description: `Enum value: ${opt}`
            }));
        }

        dialogTitle.textContent = title;
        dialogDescription.textContent = description;

        dialogOptions.innerHTML = "";
        options.forEach(option => {
            const optionEl = document.createElement("div");
            optionEl.className = "dialog-option";
            optionEl.dataset.value = option.value;

            if (option.value === inputElement.value) {
                optionEl.classList.add("selected");
            }

            optionEl.innerHTML = `
            <div class="dialog-option-radio"></div>
            <div>
                <div class="dialog-option-label">${option.label}</div>
                <div class="dialog-option-description">${option.description}</div>
            </div>
        `;

            optionEl.addEventListener("click", () => {
                dialog
                    .querySelectorAll(".dialog-option")
                    .forEach(opt => opt.classList.remove("selected"));
                optionEl.classList.add("selected");
                confirmBtn.disabled = false;
            });

            dialogOptions.appendChild(optionEl);
        });

        confirmBtn.disabled = !dialog.querySelector(".dialog-option.selected");

        dialog.classList.remove("hidden");

        function handleConfirm() {
            const selectedOption = dialog.querySelector(
                ".dialog-option.selected"
            );
            if (selectedOption) {
                inputElement.value = selectedOption.dataset.value;
                dialog.classList.add("hidden");

                // Remove event listeners
                dialog
                    .querySelector(".dialog-close-btn")
                    .removeEventListener("click", handleClose);
                dialog
                    .querySelector(".dialog-cancel-btn")
                    .removeEventListener("click", handleClose);
                confirmBtn.removeEventListener("click", handleConfirm);
                dialog
                    .querySelector(".dialog-backdrop")
                    .removeEventListener("click", handleClose);
            }
        }

        function handleClose() {
            dialog.classList.add("hidden");

            // Remove event listeners
            dialog
                .querySelector(".dialog-close-btn")
                .removeEventListener("click", handleClose);
            dialog
                .querySelector(".dialog-cancel-btn")
                .removeEventListener("click", handleClose);
            confirmBtn.removeEventListener("click", handleConfirm);
            dialog
                .querySelector(".dialog-backdrop")
                .removeEventListener("click", handleClose);
        }

        // Add event listeners
        dialog
            .querySelector(".dialog-close-btn")
            .addEventListener("click", handleClose);
        dialog
            .querySelector(".dialog-cancel-btn")
            .addEventListener("click", handleClose);
        confirmBtn.addEventListener("click", handleConfirm);
        dialog
            .querySelector(".dialog-backdrop")
            .addEventListener("click", handleClose);
    }

    function setupEndpointContentHandlers(contentElement, endpoint) {
        contentElement.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const tabName = this.getAttribute("data-tab");
                const tabsHeader = this.closest(".tabs-header");
                const tabsContent =
                    this.closest(".endpoint-tabs").querySelector(
                        ".tabs-content"
                    );

                tabsHeader
                    .querySelectorAll(".tab-btn")
                    .forEach(b => b.classList.remove("active"));
                this.classList.add("active");

                tabsContent.querySelectorAll(".tab-pane").forEach(pane => {
                    pane.classList.remove("active");
                    if (pane.id === tabName) {
                        pane.classList.add("active");
                    }
                });
            });
        });

        const formatJsonBtn = contentElement.querySelector(".format-json-btn");
        if (formatJsonBtn) {
            formatJsonBtn.addEventListener("click", function () {
                const editor = this.closest(
                    ".code-editor-container"
                ).querySelector(".code-editor");
                try {
                    const formatted = JSON.stringify(
                        JSON.parse(editor.textContent),
                        null,
                        2
                    );
                    editor.textContent = formatted;
                } catch (e) {
                    alert("Invalid JSON: " + e.message);
                }
            });
        }

        const executeBtn = contentElement.querySelector(".execute-btn");
        if (executeBtn) {
            executeBtn.addEventListener("click", function () {
                const endpointCard = this.closest(".endpoint-card");
                executeRequest(this, endpointCard);
            });
        }
    }

    function renderEndpoints(endpoints) {
        const oldEndpoints =
            endpointsContainer.querySelectorAll(".endpoint-card");
        if (oldEndpoints.length > 0) {
            oldEndpoints.forEach(card => {
                card.style.opacity = "0";
                card.style.transform = "translateY(10px)";
            });

            setTimeout(() => {
                endpointsContainer.innerHTML = "";
                renderEndpointsContent(endpoints);
            }, 100);
        } else {
            endpointsContainer.innerHTML = "";
            renderEndpointsContent(endpoints);
        }
    }

    function renderEndpointsContent(endpoints) {
        if (!endpoints || endpoints.length === 0) {
            endpointsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search fa-3x mb-4 text-text-secondary"></i>
                <h3 class="text-xl font-semibold mb-2">No endpoints found</h3>
                <p class="text-text-secondary">Try adjusting your search term</p>
            </div>
        `;
            return;
        }

        const fragment = document.createDocumentFragment();

        endpoints.forEach(endpoint => {
            const endpointCard = document.createElement("div");
            endpointCard.className = "endpoint-card";
            endpointCard.dataset.path = endpoint.path;
            endpointCard.dataset.method = endpoint.method;

            const header = document.createElement("div");
            header.className = "endpoint-header";

            const methodTag = document.createElement("span");
            methodTag.className = `method-tag ${endpoint.method.toLowerCase()}`;
            methodTag.textContent = endpoint.method;

            const pathContainer = document.createElement("div");
            pathContainer.className = "endpoint-path-container";

            const pathEl = document.createElement("span");
            pathEl.className = "endpoint-path";
            pathEl.textContent = endpoint.path;

            pathContainer.appendChild(pathEl);

            const headerLeft = document.createElement("div");
            headerLeft.className = "flex items-center";
            headerLeft.appendChild(methodTag);
            headerLeft.appendChild(pathContainer);

            const toggleBtn = document.createElement("button");
            toggleBtn.className = "endpoint-toggle-btn";
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';

            header.appendChild(headerLeft);
            header.appendChild(toggleBtn);

            const summary = document.createElement("div");
            summary.className = "endpoint-summary";
            summary.textContent = endpoint.summary;

            const content = document.createElement("div");
            content.className = "endpoint-content";
            content.style.display = "none";
            content.dataset.loaded = "false";

            endpointCard.appendChild(header);
            endpointCard.appendChild(summary);
            endpointCard.appendChild(content);

            fragment.appendChild(endpointCard);
        });

        endpointsContainer.appendChild(fragment);

        setTimeout(() => {
            const newEndpoints =
                endpointsContainer.querySelectorAll(".endpoint-card");
            newEndpoints.forEach((card, index) => {
                card.style.opacity = "0";
                card.style.transform = "translateY(10px)";

                setTimeout(() => {
                    card.style.transition =
                        "opacity 0.3s ease, transform 0.3s ease";
                    card.style.opacity = "1";
                    card.style.transform = "translateY(0)";
                }, index * 50);
            });
        }, 10);
    }

    function generateCurlCommand(endpoint) {
        const baseUrl = document
            .querySelector(".base-url-container .text-primary")
            .textContent.trim();
        let url = endpoint.path;

        url = url.replace(/{([^}]+)}/g, (match, param) => {
            const parameter = endpoint.parameters?.find(p => p.name === param);
            if (parameter) {
                if (
                    parameter.type === "integer" ||
                    parameter.type === "number"
                ) {
                    return "1";
                } else {
                    return "example";
                }
            }
            return match;
        });

        let command = `curl -X ${endpoint.method} "${baseUrl}${url}"`;

        if (endpoint.path.includes("/auth/")) {
            command += ' \\\n  -H "Content-Type: application/json"';
        } else {
            command += ' \\\n  -H "Authorization: Bearer YOUR_API_KEY"';
            command += ' \\\n  -H "Content-Type: application/json"';
        }

        if (endpoint.method !== "GET" && endpoint.parameters) {
            const bodyParams = endpoint.parameters.filter(p => p.in === "body");
            if (bodyParams.length > 0 || endpoint.bodySchema) {
                command += " \\\n  -d '";

                if (endpoint.bodySchema) {
                    const exampleBody = generateExampleFromSchema(
                        endpoint.bodySchema,
                        window.swaggerDoc
                    );
                    command += JSON.stringify(exampleBody, null, 2);
                } else if (bodyParams.length > 0) {
                    const exampleBody = {};
                    bodyParams.forEach(param => {
                        switch (param.type) {
                            case "string":
                                exampleBody[
                                    param.name
                                ] = `Example ${param.name}`;
                                break;
                            case "number":
                            case "integer":
                                exampleBody[param.name] = 1;
                                break;
                            case "boolean":
                                exampleBody[param.name] = true;
                                break;
                            case "array":
                                exampleBody[param.name] = [
                                    "example1",
                                    "example2"
                                ];
                                break;
                            case "object":
                                exampleBody[param.name] = {};
                                break;
                            default:
                                exampleBody[param.name] = null;
                        }
                    });

                    command += JSON.stringify(exampleBody, null, 2);
                } else {
                    command += "{}";
                }

                command += "'";
            }
        }

        return command;
    }

    function setupSwaggerTryItOut(template, endpoint) {
        const tryItContainer = template.querySelector(".try-it-params");

        tryItContainer.innerHTML = '<h4 class="section-title">Parameters</h4>';

        if (endpoint.parameters && endpoint.parameters.length > 0) {
            const pathParams = endpoint.parameters.filter(p => p.in === "path");
            const queryParams = endpoint.parameters.filter(
                p => p.in === "query"
            );
            const bodyParams = endpoint.parameters.filter(p => p.in === "body");

            if (pathParams.length > 0) {
                const pathParamsSection = document.createElement("div");
                pathParamsSection.className = "params-section mb-4";
                pathParamsSection.innerHTML =
                    '<h5 class="params-section-title">Path Parameters</h5>';

                pathParams.forEach(param => {
                    const paramRow = createParameterRow(param, "path");
                    pathParamsSection.appendChild(paramRow);
                });

                tryItContainer.appendChild(pathParamsSection);
            }

            if (queryParams.length > 0) {
                const queryParamsSection = document.createElement("div");
                queryParamsSection.className = "params-section mb-4";
                queryParamsSection.innerHTML =
                    '<h5 class="params-section-title">Query Parameters</h5>';

                queryParams.forEach(param => {
                    const paramRow = createParameterRow(param, "query");
                    queryParamsSection.appendChild(paramRow);
                });

                tryItContainer.appendChild(queryParamsSection);
            }

            if (
                (bodyParams.length > 0 || endpoint.bodySchema) &&
                endpoint.method !== "GET"
            ) {
                const requestBodyContainer = document.createElement("div");
                requestBodyContainer.className = "request-body-container mb-4";
                requestBodyContainer.innerHTML = `
                    <h5 class="params-section-title">Request Body</h5>
                    <div class="code-editor-container">
                        <pre class="code-editor request-body-editor" contenteditable="true">${generateJsonBody(
                            endpoint
                        )}</pre>
                        <button class="format-json-btn">
                            <i class="fas fa-code"></i>
                        </button>
                    </div>
                `;

                tryItContainer.appendChild(requestBodyContainer);

                const formatJsonBtn =
                    requestBodyContainer.querySelector(".format-json-btn");
                formatJsonBtn.addEventListener("click", function () {
                    const editor = this.closest(
                        ".code-editor-container"
                    ).querySelector(".code-editor");
                    try {
                        const formatted = JSON.stringify(
                            JSON.parse(editor.textContent),
                            null,
                            2
                        );
                        editor.textContent = formatted;
                    } catch (e) {
                        alert("Invalid JSON: " + e.message);
                    }
                });
            }
        } else if (endpoint.bodySchema && endpoint.method !== "GET") {
            const requestBodyContainer = document.createElement("div");
            requestBodyContainer.className = "request-body-container mb-4";
            requestBodyContainer.innerHTML = `
                <h5 class="params-section-title">Request Body</h5>
                <div class="code-editor-container">
                    <pre class="code-editor request-body-editor" contenteditable="true">${generateJsonBody(
                        endpoint
                    )}</pre>
                    <button class="format-json-btn">
                        <i class="fas fa-code"></i>
                    </button>
                </div>
            `;

            tryItContainer.appendChild(requestBodyContainer);

            const formatJsonBtn =
                requestBodyContainer.querySelector(".format-json-btn");
            formatJsonBtn.addEventListener("click", function () {
                const editor = this.closest(
                    ".code-editor-container"
                ).querySelector(".code-editor");
                try {
                    const formatted = JSON.stringify(
                        JSON.parse(editor.textContent),
                        null,
                        2
                    );
                    editor.textContent = formatted;
                } catch (e) {
                    alert("Invalid JSON: " + e.message);
                }
            });
        } else {
            tryItContainer.innerHTML +=
                "<p>This endpoint does not require any parameters.</p>";
        }

        const responseSection = template.querySelector(".try-it-response");
        if (!responseSection) {
            const newResponseSection = document.createElement("div");
            newResponseSection.className = "try-it-response hidden";
            newResponseSection.innerHTML = `
                <h4 class="section-title response-title">
                    Server response
                    <span class="response-status"></span>
                    <span class="response-time"></span>
                </h4>
                
                <div class="response-body">
                    <h5 class="response-subtitle">Response body</h5>
                    <div class="code-editor-container">
                        <pre class="code-editor response-viewer"></pre>
                        <button class="copy-response-btn">
                            <i class="far fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="response-headers">
                    <h5 class="response-subtitle">Response headers</h5>
                    <div class="code-editor-container">
                        <pre class="code-editor response-headers-viewer"></pre>
                    </div>
                </div>
                
                <div class="response-curl">
                    <h5 class="response-subtitle">Curl</h5>
                    <div class="code-editor-container">
                        <pre class="code-editor response-curl-viewer"></pre>
                        <button class="copy-curl-btn">
                            <i class="far fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
            template.querySelector("#try-it").appendChild(newResponseSection);
        }
    }

    function createParameterRow(param, paramType) {
        const paramRow = document.createElement("div");
        paramRow.className = "parameter-row";

        let inputHtml = "";

        if (param.enum) {
            inputHtml = `
                <select class="parameter-select" 
                       data-param="${param.name}" 
                       data-type="${param.type}" 
                       data-required="${param.required}" 
                       data-in="${paramType}"
                       ${param.required ? "required" : ""}>
                    <option value="">Select ${param.name}</option>
                    ${param.enum
                        .map(
                            option =>
                                `<option value="${option}">${option}</option>`
                        )
                        .join("")}
                </select>
            `;
        } else {
            inputHtml = `
                <input type="text" class="parameter-input" 
                       data-param="${param.name}" 
                       data-type="${param.type}" 
                       data-required="${param.required}" 
                       data-in="${paramType}"
                       placeholder="${
                           param.type === "array"
                               ? '["item1", "item2"]'
                               : `Enter ${param.name}`
                       }"
                       ${param.required ? "required" : ""}>
            `;
        }

        paramRow.innerHTML = `
            <div class="parameter-header">
                <div class="parameter-name">
                    ${param.name}
                    ${
                        param.required
                            ? '<span class="parameter-required">*</span>'
                            : ""
                    }
                    <span class="parameter-type">${param.type}</span>
                </div>
            </div>
            <div class="parameter-body">
                <div class="parameter-description">${param.description}</div>
                ${inputHtml}
            </div>
        `;

        return paramRow;
    }

    function generateJsonBody(endpoint) {
        if (endpoint.bodySchema) {
            const example = generateExampleFromSchema(
                endpoint.bodySchema,
                window.swaggerDoc
            );
            return JSON.stringify(example, null, 2);
        }

        const exampleBody = {};
        const bodyParams = endpoint.parameters.filter(p => p.in === "body");

        if (bodyParams.length > 0 && bodyParams[0].schema) {
            return JSON.stringify(
                generateExampleFromSchema(
                    bodyParams[0].schema,
                    window.swaggerDoc
                ),
                null,
                2
            );
        }

        bodyParams.forEach(param => {
            switch (param.type) {
                case "string":
                    exampleBody[param.name] =
                        param.example ||
                        param.enum?.[0] ||
                        `Example ${param.name}`;
                    break;
                case "number":
                case "integer":
                    exampleBody[param.name] =
                        param.example || param.enum?.[0] || 1;
                    break;
                case "boolean":
                    exampleBody[param.name] =
                        param.example !== undefined ? param.example : true;
                    break;
                case "array":
                    exampleBody[param.name] = param.example || [
                        "example1",
                        "example2"
                    ];
                    break;
                case "object":
                    exampleBody[param.name] = param.example || {};
                    break;
                default:
                    exampleBody[param.name] = null;
            }
        });

        return JSON.stringify(exampleBody, null, 2);
    }

    function generateExampleFromSchema(schema, swaggerDoc) {
        if (!schema) return {};

        if (schema.$ref) {
            const resolved = resolveSchemaRef(schema.$ref, swaggerDoc);
            if (resolved) {
                return generateExampleFromSchema(resolved, swaggerDoc);
            }
            return {};
        }

        if (schema.example !== undefined) {
            return schema.example;
        }

        switch (schema.type) {
            case "object":
                const obj = {};

                if (schema.properties) {
                    Object.keys(schema.properties).forEach(propName => {
                        const propSchema = schema.properties[propName];
                        obj[propName] = generateExampleFromSchema(
                            propSchema,
                            swaggerDoc
                        );
                    });
                }

                if (schema.additionalProperties) {
                    obj["additionalProp1"] = generateExampleFromSchema(
                        schema.additionalProperties,
                        swaggerDoc
                    );
                }

                return obj;

            case "array":
                if (schema.items) {
                    return [
                        generateExampleFromSchema(schema.items, swaggerDoc)
                    ];
                }
                return [];
            case "string":
                if (schema.format === "date") return "2099-01-01";
                if (schema.format === "date-time")
                    return "2099-01-01T12:00:00Z";
                if (schema.format === "email") return "user@example.com";
                if (schema.format === "uuid")
                    return "123e4567-e89b-12d3-a456-426614174000";
                if (schema.format === "uri") return "https://example.com";

                if (schema.enum && schema.enum.length > 0) {
                    return schema.enum[0];
                }

                return "string";
            case "number":
            case "integer":
                if (schema.enum && schema.enum.length > 0) {
                    return schema.enum[0];
                }

                if (schema.minimum !== undefined) {
                    return schema.minimum;
                }

                return schema.type === "integer" ? 1 : 1.0;
            case "boolean":
                return true;
            case "null":
                return null;
            default:
                if (schema.properties) {
                    const obj = {};
                    Object.keys(schema.properties).forEach(propName => {
                        obj[propName] = generateExampleFromSchema(
                            schema.properties[propName],
                            swaggerDoc
                        );
                    });
                    return obj;
                }
                return {};
        }
    }

    async function executeApiRequest(method, url, headers, body) {
        try {
            const options = {
                method: method,
                headers: headers,
                credentials: "same-origin"
            };

            if (method !== "GET" && method !== "HEAD") {
                options.body = JSON.stringify(body);
            }

            const startTime = performance.now();
            const response = await fetch(url, options);
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            let responseData;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            return {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                data: responseData,
                duration: duration
            };
        } catch (error) {
            throw {
                status: 0,
                message: "Network Error",
                details: error.message,
                duration: 0
            };
        }
    }

    function processBodyBooleans(obj) {
        if (typeof obj !== "object" || obj === null) return;

        Object.keys(obj).forEach(key => {
            const value = obj[key];

            if (typeof value === "string") {
                if (value === "true") obj[key] = true;
                else if (value === "false") obj[key] = false;
            } else if (typeof value === "object") {
                processBodyBooleans(value);
            }
        });
    }

    function executeRequest(executeBtn, endpointCard) {
        const requiredInputs = endpointCard.querySelectorAll(
            '.parameter-input[data-required="true"], .parameter-select[data-required="true"]'
        );
        let hasErrors = false;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add("error");
                hasErrors = true;
            } else {
                input.classList.remove("error");
            }
        });

        if (hasErrors) {
            alert("Please fill in all required fields.");
            return;
        }

        executeBtn.classList.add("loading");
        const originalText = executeBtn.innerHTML;
        executeBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin mr-2"></i>Executing...';
        executeBtn.disabled = true;

        const responseSection = endpointCard.querySelector(".try-it-response");
        const responseViewer = endpointCard.querySelector(".response-viewer");
        const responseHeadersViewer = endpointCard.querySelector(
            ".response-headers-viewer"
        );
        const responseCurlViewer = endpointCard.querySelector(
            ".response-curl-viewer"
        );
        const responseStatus = endpointCard.querySelector(".response-status");
        const responseTime = endpointCard.querySelector(".response-time");

        const method = endpointCard.querySelector(".method-tag").textContent;
        const path = endpointCard.querySelector(".endpoint-path").textContent;
        const baseUrl = document
            .querySelector(".base-url-container .text-primary")
            .textContent.trim();

        let requestPath = path;
        const queryParams = [];
        const headers = {
            "Content-Type": "application/json"
        };

        headers["Authorization"] = "Bearer YOUR_API_KEY";

        let body = {};
        const bodyEditor = endpointCard.querySelector(".request-body-editor");

        if (bodyEditor) {
            try {
                body = JSON.parse(bodyEditor.textContent);
                processBodyBooleans(body);
            } catch (e) {
                console.error("Invalid JSON body:", e);
                alert("Invalid JSON body: " + e.message);
                executeBtn.innerHTML = originalText;
                executeBtn.disabled = false;
                executeBtn.classList.remove("loading");
                return;
            }
        }

        const pathAndQueryInputs = endpointCard.querySelectorAll(
            '.parameter-input[data-in="path"], .parameter-input[data-in="query"], .parameter-select[data-in="path"], .parameter-select[data-in="query"]'
        );
        pathAndQueryInputs.forEach(input => {
            const param = input.dataset.param;
            const value = input.value;
            const inType = input.dataset.in;
            const paramType = input.dataset.type;

            if (value) {
                if (inType === "path") {
                    requestPath = requestPath.replace(
                        `{${param}}`,
                        encodeURIComponent(value)
                    );
                } else if (inType === "query") {
                    let processedValue = value;
                    if (paramType === "boolean") {
                        processedValue = value === "true";
                    }

                    queryParams.push(
                        `${encodeURIComponent(param)}=${encodeURIComponent(
                            processedValue
                        )}`
                    );
                }
            }
        });

        let url = baseUrl + requestPath;
        if (queryParams.length > 0) {
            url += "?" + queryParams.join("&");
        }

        let curlCommand = `curl -X ${method} "${url}"`;
        Object.entries(headers).forEach(([key, value]) => {
            curlCommand += `\n  -H "${key}: ${value}"`;
        });

        if (method !== "GET" && Object.keys(body).length > 0) {
            curlCommand += `\n  -d '${JSON.stringify(body, null, 2)}'`;
        }

        executeApiRequest(method, url, headers, body)
            .then(result => {
                responseSection.classList.remove("hidden");

                if (typeof result.data === "object") {
                    responseViewer.textContent = JSON.stringify(
                        result.data,
                        null,
                        2
                    );
                } else {
                    responseViewer.textContent = result.data;
                }

                responseHeadersViewer.textContent = JSON.stringify(
                    result.headers,
                    null,
                    2
                );
                responseCurlViewer.textContent = curlCommand;

                responseStatus.textContent = `${result.status} ${result.statusText}`;
                responseStatus.className =
                    "response-status " +
                    (result.status < 300
                        ? "success"
                        : result.status < 400
                        ? "warning"
                        : "error");

                responseTime.textContent = `(${result.duration}ms)`;

                executeBtn.innerHTML = originalText;
                executeBtn.disabled = false;
                executeBtn.classList.remove("loading");

                responseSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            })
            .catch(error => {
                responseSection.classList.remove("hidden");

                responseViewer.textContent = JSON.stringify(
                    {
                        error: "Request Failed",
                        message: error.message,
                        details: error.details || null
                    },
                    null,
                    2
                );

                responseHeadersViewer.textContent = "{}";
                responseCurlViewer.textContent = curlCommand;

                responseStatus.textContent = `${error.status || 500} Error`;
                responseStatus.className = "response-status error";

                responseTime.textContent = `(${error.duration || 0}ms)`;

                executeBtn.innerHTML = originalText;
                executeBtn.disabled = false;
                executeBtn.classList.remove("loading");

                responseSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });
    }
});