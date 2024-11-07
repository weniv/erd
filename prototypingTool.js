// 연결선 관리 및 편집 기능 강화

class OrthogonalConnectionManager {
    constructor(tool) {
        this.tool = tool;
        this.padding = 20; // 선과 테이블 사이의 여백
    }

    // 직각 연결선의 경로 계산
    calculateOrthogonalPath(start, end) {
        const path = [];
        path.push([start.x, start.y]); // 시작점

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const midX = start.x + dx / 2;
        const midY = start.y + dy / 2;

        // 연결 방향에 따른 경로 계산
        switch (start.position + '-' + end.position) {
            case 'right-left':
            case 'left-right':
                path.push([midX, start.y]);
                path.push([midX, end.y]);
                break;
            case 'bottom-top':
            case 'top-bottom':
                path.push([start.x, midY]);
                path.push([end.x, midY]);
                break;
            case 'top-left':
            case 'top-right':
                path.push([start.x, start.y - this.padding]);
                path.push([end.x, start.y - this.padding]);
                break;
            case 'bottom-left':
            case 'bottom-right':
                path.push([start.x, start.y + this.padding]);
                path.push([end.x, start.y + this.padding]);
                break;
            case 'left-top':
            case 'right-top':
                path.push([start.x - this.padding, start.y]);
                path.push([start.x - this.padding, end.y]);
                break;
            case 'left-bottom':
            case 'right-bottom':
                path.push([start.x + this.padding, start.y]);
                path.push([start.x + this.padding, end.y]);
                break;
            default:
                path.push([midX, start.y]);
                path.push([midX, end.y]);
        }

        path.push([end.x, end.y]); // 끝점
        return path;
    }

    // SVG 경로 문자열 생성
    createSvgPath(points) {
        let d = `M ${points[0][0]} ${points[0][1]}`; // 시작점
        
        // 각 점을 순회하며 곡선 처리
        for (let i = 1; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            
            // 직선 구간
            d += ` L ${current[0]} ${current[1]}`;
            
            // 코너에 radius 추가
            if (i < points.length - 2) {
                const radius = 10; // radius 크기
                const dx = next[0] - current[0];
                const dy = next[1] - current[1];
                
                if (dx !== 0 && dy !== 0) {
                    // radius를 위한 제어점 계산
                    if (Math.abs(dx) > radius * 2 && Math.abs(dy) > radius * 2) {
                        d += ` Q ${current[0]} ${current[1]}, ${current[0] + Math.sign(dx) * radius} ${current[1]}`;
                        d += ` L ${next[0] - Math.sign(dx) * radius} ${current[1]}`;
                        d += ` Q ${next[0]} ${current[1]}, ${next[0]} ${current[1] + Math.sign(dy) * radius}`;
                    }
                }
            }
        }
        
        // 마지막 점
        d += ` L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`;
        return d;
    }

    // 연결선 업데이트
    updateConnection(connection) {
        const start = this.getConnectionPoint(connection.sourceId, connection.sourcePosition);
        const end = this.getConnectionPoint(connection.targetId, connection.targetPosition);
        
        if (!start || !end) return;

        // 수정된 부분: 연결선의 경로를 다시 계산하고 SVG path 업데이트
        const points = this.calculateOrthogonalPath(start, end);
        if (!points || points.length < 2) return;  // points 배열 검증 추가

        const pathD = this.createSvgPath(points);
        if (!pathD) return; // pathD가 유효하지 않으면 리턴

        const svg = document.querySelector(`[data-connection-id="${connection.id}"]`);
        if (svg) {
            const path = svg.querySelector('path');
            if (path) {
                path.setAttribute('d', pathD);
            }

            // 레이블 위치도 업데이트
            const text = svg.querySelector('text');
            if (text && points.length > 0) {  // points 배열이 비어있지 않은지 확인
                const midPoint = this.getMidPoint(points);
                if (midPoint && typeof midPoint.x === 'number' && typeof midPoint.y === 'number') {
                    text.setAttribute('x', midPoint.x.toString());
                    text.setAttribute('y', midPoint.y.toString());
                }
            }
        }
    }

    // 중간점 계산
    getMidPoint(points) {
        const midIndex = Math.floor(points.length / 2);
        return {
            x: points[midIndex][0],
            y: points[midIndex][1]
        };
    }

    // 연결점 위치 계산 (기존 메서드 개선)
    getConnectionPoint(elementId, position) {
        const element = document.getElementById(`element-${elementId}`);
        if (!element) return null;
    
        const rect = element.getBoundingClientRect();
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
    
        // 캔버스의 transform 상태를 고려한 좌표 계산
        const x = (rect.left - canvasRect.left) / this.tool.scale - this.tool.canvasOffset.x / this.tool.scale;
        const y = (rect.top - canvasRect.top) / this.tool.scale - this.tool.canvasOffset.y / this.tool.scale;
        const width = rect.width / this.tool.scale;
        const height = rect.height / this.tool.scale;
    
        // 각 위치에 따른 연결점 위치 반환
        switch (position) {
            case 'top':
                return { x: x + width / 2, y, position: 'top' };
            case 'right':
                return { x: x + width, y: y + height / 2, position: 'right' };
            case 'bottom':
                return { x: x + width / 2, y: y + height, position: 'bottom' };
            case 'left':
                return { x, y: y + height / 2, position: 'left' };
            default:
                return null;
        }
    }
}

class ConnectionManager {
    constructor(tool) {
        this.tool = tool;
        // orthogonalConnectionManager는 이미 tool에 있으므로 직접 참조할 필요 없음
        
        this.selectConnection = this.selectConnection.bind(this);
        this.showRelationEditDialog = this.showRelationEditDialog.bind(this);
        this.initializeConnectionControls();
    }

    selectConnection(connection) {
        // 이전 선택 해제
        if (this.selectedConnection) {
            const prevPath = document.querySelector(
                `[data-connection-id="${this.selectedConnection.id}"] path`
            );
            if (prevPath) {
                prevPath.classList.remove('selected');
            }
        }

        this.selectedConnection = connection;
        const path = document.querySelector(
            `[data-connection-id="${connection.id}"] path`
        );
        if (path) {
            path.classList.add('selected');
        }

        // ConnectionManager에 선택 이벤트 발송
        const event = new CustomEvent('connection-selected', { detail: connection });
        document.getElementById('properties').dispatchEvent(event);
    }

    showRelationEditDialog(connection) {
        const dialog = document.createElement('div');
        dialog.className = 'relation-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Edit Relationship Type</h3>
                <div class="relation-options">
                    ${this.tool.relationTypes.map(type => `
                        <button class="relation-option ${type.name === connection.type ? 'active' : ''}"
                                data-type="${type.name}">
                            <span class="relation-name">${type.name}</span>
                            <span class="relation-symbol">${type.symbol}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="dialog-buttons">
                    <button class="apply-btn">Apply</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        // 관계 옵션 선택 스타일링
        const handleOptionClick = (btn) => {
            // 기존 선택 해제
            dialog.querySelectorAll('.relation-option').forEach(b => 
                b.classList.remove('active')
            );
            // 새로운 선택 활성화
            btn.classList.add('active');
        };

        dialog.querySelectorAll('.relation-option').forEach(button => {
            button.onclick = () => handleOptionClick(button);
        });

        // 현재 선택된 관계 타입에 대한 스타일 적용
        const currentOption = dialog.querySelector(`[data-type="${connection.type}"]`);
        if (currentOption) {
            currentOption.classList.add('active');
        }

        // Apply 버튼 핸들러
        dialog.querySelector('.apply-btn').onclick = () => {
            const activeOption = dialog.querySelector('.relation-option.active');
            if (activeOption) {
                const newType = activeOption.dataset.type;
                const identifying = dialog.querySelector('[name="identifying"]')?.checked;
                
                // 연결 객체 업데이트
                connection.type = newType;
                if (identifying !== undefined) {
                    connection.identifying = identifying;
                }
        
                // 연결선 표시 업데이트
                this.tool.updateConnectionDisplay(connection);
                
                document.body.removeChild(dialog);
                this.selectConnection(connection); // 속성 패널 업데이트
            }
        };

        // Cancel 버튼 핸들러
        dialog.querySelector('.cancel-btn').onclick = () => {
            document.body.removeChild(dialog);
        };

        document.body.appendChild(dialog);
    }

    initializeConnectionControls() {
        // 연결선 컨텍스트 메뉴 초기화
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('contextmenu', (e) => {
            const connection = this.tool.findConnectionAtPoint(e.clientX, e.clientY);
            if (connection) {
                e.preventDefault();
                this.showConnectionContextMenu(e, connection);
            }
        });

        // 프로퍼티 패널에 연결 스타일 컨트롤 추가
        document.getElementById('properties').addEventListener('connection-selected', (e) => {
            const connection = e.detail;
            this.showConnectionProperties(connection);
        });
    }

    showConnectionContextMenu(e, connection) {
        const menu = document.createElement('div');
        menu.className = 'connection-context-menu';
        menu.style.position = 'absolute';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        
        menu.innerHTML = `
            <div class="menu-item edit">편집</div>
            <div class="menu-item style">스타일</div>
            <div class="menu-item route">경로 조정</div>
            <div class="menu-item delete">삭제</div>
        `;

        // 메뉴 이벤트 핸들러
        menu.querySelector('.edit').onclick = () => {
            this.showRelationEditDialog(connection);
            document.body.removeChild(menu);
        };

        menu.querySelector('.style').onclick = () => {
            this.showStyleEditor(connection);
            document.body.removeChild(menu);
        };

        menu.querySelector('.route').onclick = () => {
            this.enableRouteEditing(connection);
            document.body.removeChild(menu);
        };

        menu.querySelector('.delete').onclick = () => {
            if (confirm('이 관계를 삭제하시겠습니까?')) {
                this.tool.deleteConnection(connection.id);
            }
            document.body.removeChild(menu);
        };

        document.body.appendChild(menu);

        // 외부 클릭시 메뉴 닫기
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                document.body.removeChild(menu);
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }

    showRelationEditDialog(connection) {
        const dialog = document.createElement('div');
        dialog.className = 'relation-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Edit Relationship Type</h3>
                <div class="relation-options">
                    ${this.tool.relationTypes.map(type => `
                        <button class="relation-option ${type.name === connection.type ? 'active' : ''}"
                                data-type="${type.name}">
                            <span class="relation-name">${type.name}</span>
                            <span class="relation-symbol">${type.symbol}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="additional-options">
                    <label>
                        <input type="checkbox" name="identifying" 
                            ${connection.identifying ? 'checked' : ''}>
                        Identifying Relationship
                    </label>
                </div>
                <div class="dialog-buttons">
                    <button class="apply-btn">Apply</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
    
        // 관계 옵션 선택 이벤트
        dialog.querySelectorAll('.relation-option').forEach(button => {
            button.onclick = () => {
                dialog.querySelectorAll('.relation-option').forEach(b => 
                    b.classList.remove('active')
                );
                button.classList.add('active');
            };
        });
    
        // Apply 버튼 핸들러
        dialog.querySelector('.apply-btn').onclick = () => {
            const activeOption = dialog.querySelector('.relation-option.active');
            if (activeOption) {
                const newType = activeOption.dataset.type;
                const identifying = dialog.querySelector('[name="identifying"]').checked;
                
                // 연결 속성 업데이트
                connection.type = newType;
                connection.identifying = identifying;
    
                // SVG 요소 업데이트
                this.tool.updateConnectionDisplay(connection);
            }
            document.body.removeChild(dialog);
        };
    
        // Cancel 버튼 핸들러
        dialog.querySelector('.cancel-btn').onclick = () => {
            document.body.removeChild(dialog);
        };
    
        document.body.appendChild(dialog);
    }

    showStyleEditor(connection) {
        const dialog = document.createElement('div');
        dialog.className = 'connection-style-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>연결선 스타일</h3>
                <div class="style-options">
                    <div class="style-option">
                        <label>색상</label>
                        <input type="color" class="color-picker" value="${connection.color || '#2196f3'}">
                    </div>
                    <div class="style-option">
                        <label>선 두께</label>
                        <input type="range" min="1" max="5" value="${connection.strokeWidth || 2}" class="width-slider">
                    </div>
                    <div class="style-option">
                        <label>선 스타일</label>
                        <select class="line-style">
                            <option value="solid" ${connection.lineStyle === 'solid' ? 'selected' : ''}>실선</option>
                            <option value="dashed" ${connection.lineStyle === 'dashed' ? 'selected' : ''}>점선</option>
                        </select>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="apply-btn">적용</button>
                    <button class="cancel-btn">취소</button>
                </div>
            </div>
        `;

        // 스타일 변경 이벤트 핸들러
        dialog.querySelector('.apply-btn').onclick = () => {
            const color = dialog.querySelector('.color-picker').value;
            const strokeWidth = dialog.querySelector('.width-slider').value;
            const lineStyle = dialog.querySelector('.line-style').value;

            this.updateConnectionStyle(connection.id, {
                color: color,
                strokeWidth: strokeWidth,
                lineStyle: lineStyle
            });

            document.body.removeChild(dialog);
        };

        document.body.appendChild(dialog);
    }

    enableRouteEditing(connection) {
        // 연결선에 조절점 추가
        const line = document.querySelector(`[data-connection-id="${connection.id}"] line`);
        if (!line) return;

        // 기존 직선을 path로 변환
        const path = this.createPathFromLine(line);
        line.replaceWith(path);

        // 조절점 추가
        this.addControlPoints(path, connection);
    }

    createPathFromLine(line) {
        const x1 = line.getAttribute('x1');
        const y1 = line.getAttribute('y1');
        const x2 = line.getAttribute('x2');
        const y2 = line.getAttribute('y2');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
        path.setAttribute('stroke', line.getAttribute('stroke'));
        path.setAttribute('stroke-width', line.getAttribute('stroke-width'));

        return path;
    }

    addControlPoints(path, connection) {
        // path의 중간점에 조절점 추가
        const points = path.getAttribute('d').split(' ');
        const x1 = parseFloat(points[1]);
        const y1 = parseFloat(points[2]);
        const x2 = parseFloat(points[4]);
        const y2 = parseFloat(points[5]);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // 조절점 생성
        const controlPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        controlPoint.setAttribute('cx', midX);
        controlPoint.setAttribute('cy', midY);
        controlPoint.setAttribute('r', 5);
        controlPoint.setAttribute('fill', '#2196f3');
        controlPoint.setAttribute('cursor', 'move');

        // 조절점 드래그 이벤트
        this.enableControlPointDrag(controlPoint, path, connection);

        path.parentNode.appendChild(controlPoint);
    }

    enableControlPointDrag(point, path, connection) {
        let dragging = false;
        let offset = { x: 0, y: 0 };

        point.addEventListener('mousedown', (e) => {
            dragging = true;
            offset = {
                x: e.clientX - parseFloat(point.getAttribute('cx')),
                y: e.clientY - parseFloat(point.getAttribute('cy'))
            };
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const x = e.clientX - offset.x;
            const y = e.clientY - offset.y;

            point.setAttribute('cx', x);
            point.setAttribute('cy', y);

            // path 업데이트
            this.updatePathWithControlPoint(path, {x, y}, connection);
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });
    }

    updatePathWithControlPoint(path, controlPoint, connection) {
        // path의 시작점과 끝점 가져오기
        const points = path.getAttribute('d').split(' ');
        const x1 = parseFloat(points[1]);
        const y1 = parseFloat(points[2]);
        const x2 = parseFloat(points[4]);
        const y2 = parseFloat(points[5]);

        // 곡선 path로 업데이트
        const d = `M ${x1} ${y1} Q ${controlPoint.x} ${controlPoint.y} ${x2} ${y2}`;
        path.setAttribute('d', d);

        // 연결 객체 업데이트
        connection.controlPoint = controlPoint;
        this.tool.saveHistory();
    }

    updateConnection(connection) {
        const start = this.tool.orthogonalConnectionManager.getConnectionPoint(connection.sourceId, connection.sourcePosition);
        const end = this.tool.orthogonalConnectionManager.getConnectionPoint(connection.targetId, connection.targetPosition);
        
        if (!start || !end) return;

        // 경로 계산
        const points = this.tool.orthogonalConnectionManager.calculateOrthogonalPath(start, end);
        const pathD = this.tool.orthogonalConnectionManager.createSvgPath(points);

        const svg = document.querySelector(`[data-connection-id="${connection.id}"]`);
        if (svg) {
            const path = svg.querySelector('path');
            if (path) {
                path.setAttribute('d', pathD);
            }

            // 레이블 위치도 업데이트
            const text = svg.querySelector('text');
            if (text) {
                const midPoint = this.tool.orthogonalConnectionManager.getMidPoint(points);
                text.setAttribute('x', midPoint.x);
                text.setAttribute('y', midPoint.y);
            }
        }
    }

    updateConnectionStyle(connectionId, style) {
        const connection = this.tool.connections.find(c => c.id === connectionId);
        if (!connection) return;

        // 스타일 속성 업데이트
        Object.assign(connection, style);

        // SVG 요소 스타일 업데이트
        const line = document.querySelector(`[data-connection-id="${connectionId}"] line`);
        if (line) {
            line.style.stroke = style.color;
            line.style.strokeWidth = style.strokeWidth;
            line.style.strokeDasharray = style.lineStyle === 'dashed' ? '5,5' : 'none';
        }

        this.tool.saveHistory();
    }

    showConnectionProperties(connection) {
        const propertiesDiv = document.getElementById('properties');
        
        propertiesDiv.innerHTML = `
            <div class="property-group">
                <label class="property-label">Relationship Type</label>
                <div class="relation-type">${connection.type}</div>
            </div>
            <div class="property-group">
                <label class="property-label">Style</label>
                <div class="connection-style-controls">
                    <div class="color-control">
                        <label>Color</label>
                        <input type="color" 
                            value="${connection.color || '#2196f3'}"
                            onchange="tool.connectionManager.updateConnectionStyle('${connection.id}', {color: this.value})">
                    </div>
                    <div class="line-style-control">
                        <label>Line Style</label>
                        <select onchange="tool.connectionManager.updateConnectionStyle('${connection.id}', {lineStyle: this.value})">
                            <option value="solid" ${connection.lineStyle === 'solid' ? 'selected' : ''}>Solid</option>
                            <option value="dashed" ${connection.lineStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                        </select>
                    </div>
                </div>
            </div>
            <button onclick="tool.connectionManager.showRelationEditDialog(tool.connections.find(c => c.id === ${connection.id}))">
                Edit Relationship
            </button>
        `;
    }
    
    // updateConnectionStyle 메서드 추가
    updateConnectionStyle(connectionId, style) {
        const connection = this.tool.connections.find(c => c.id === connectionId);
        if (!connection) return;

        // 스타일 속성 업데이트
        Object.assign(connection, style);

        // SVG 요소 업데이트
        const path = document.querySelector(`[data-connection-id="${connectionId}"] path`);
        if (path) {
            if (style.color) {
                path.setAttribute('stroke', style.color);
            }
            if (style.lineStyle) {
                path.setAttribute('stroke-dasharray', style.lineStyle === 'dashed' ? '5,5' : 'none');
            }
        }

        this.tool.saveHistory();
    }
}
class PrototypingTool {
    constructor() {
        this.checkMobileAccess();
        this.elements = [];
        this.selectedElement = null;
        this.draggedElement = null;
        this.resizingElement = null;
        this.resizeHandle = null;
        this.offset = { x: 0, y: 0 };
        this.gridSize = 0;
        this.history = [];
        this.currentHistoryIndex = -1;
        this.maxZIndex = 1;
        this.clipboard = null;

        // Table 요소의 기본 설정을 DB 테이블에 맞게 수정
        this.tableDefaults = {
            headerBgColor: '#2B3467',  // 진한 남색으로 변경
            headerTextColor: '#ffffff', // 흰색 텍스트
            cellBgColor: '#ffffff',
            borderColor: '#BAD7E9',
            textColor: '#2B3467',
            fontSize: 14,
            cellPadding: 8,
            minWidth: 300,
            minHeight: 100
        };

        // 데이터베이스 컬럼 타입 목록
        this.dbColumnTypes = [
            'INTEGER',
            'BIGINT',
            'DECIMAL',
            'FLOAT',
            'VARCHAR',
            'TEXT',
            'DATE',
            'TIMESTAMP',
            'BOOLEAN',
            'BLOB'
        ];

        // 데이터베이스 제약조건
        this.dbConstraints = [
            'PRIMARY KEY',
            'FOREIGN KEY',
            'NOT NULL',
            'UNIQUE',
            'DEFAULT',
            'CHECK'
        ]; 

        // 관계 연결 관련 속성 추가
        this.connectionStart = null;  // 연결 시작점
        this.connectionEnd = null;    // 연결 끝점
        this.tempLine = null;        // 임시 연결선
        this.connections = [];       // 테이블 간 연결 저장
        
        // 관계 타입 정의
        this.relationTypes = [
            { name: 'One-to-One', symbol: '1:1' },
            { name: 'One-to-Many', symbol: '1:N' },
            { name: 'Many-to-One', symbol: 'N:1' },
            { name: 'Many-to-Many', symbol: 'N:M' }
        ];

        this.stickyColors = [
            '#fff740', // 노랑
            '#ff7eb9', // 핑크
            '#7afcff', // 하늘
            '#98ff98', // 연두
            '#ffb347'  // 주황
        ];

        // 페이지
        this.pages = new Map(); // 페이지 저장소
        this.currentPageId = null; // 현재 페이지 ID
    
        // 줌과 패닝
        this.scale = 1;  // 줌 레벨
        this.isPanning = false;  // 패닝 중인지 여부
        this.lastPanPosition = { x: 0, y: 0 };  // 마지막 패닝 위치
        this.canvasOffset = { x: 0, y: 0 };  // 캔버스 오프셋
    
        // 디바이스 프리셋
        this.devicePresets = {
            'basic': { width: 3840, height: 2160 },
            'desktop': { width: 1920, height: 1080 },
            'laptop': { width: 1366, height: 768 },
            'custom': { width: null, height: null }
        };
        this.currentDevice = 'basic';
        this.snapThreshold = 9; // 스냅이 작동할 거리 (픽셀)
        this.snapEnabled = true; // 스냅 기능 활성화 여부
    
        // 첫 페이지 생성
        this.createPage('Home');
        
        // 초기 캔버스 크기 설정
        this.initializeCanvasSize();
        
        this.initializeEvents();
        this.saveHistory();

        this.selectedConnection = null;

        this.orthogonalConnectionManager = new OrthogonalConnectionManager(this);
        this.connectionManager = new ConnectionManager(this);
    }

    // 연결선 찾기
    findConnectionAtPoint(x, y) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const clickX = x - rect.left;
        const clickY = y - rect.top;

        return this.connections.find(connection => {
            const line = document.querySelector(`[data-connection-id="${connection.id}"] line`);
            if (!line) return false;

            const lineRect = line.getBoundingClientRect();
            const threshold = 5; // 클릭 허용 범위

            // 선과 클릭 지점 사이의 거리 계산
            const x1 = parseFloat(line.getAttribute('x1'));
            const y1 = parseFloat(line.getAttribute('y1'));
            const x2 = parseFloat(line.getAttribute('x2'));
            const y2 = parseFloat(line.getAttribute('y2'));

            const distance = this.pointToLineDistance(
                clickX, clickY,
                x1, y1,
                x2, y2
            );

            return distance < threshold;
        });
    }

    // 점과 선 사이의 거리 계산
    pointToLineDistance(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    // 연결선 선택
    selectConnection(connection) {
        // 이전 선택 해제
        if (this.selectedConnection) {
            const prevPath = document.querySelector(
                `[data-connection-id="${this.selectedConnection.id}"] path`
            );
            if (prevPath) {
                prevPath.classList.remove('selected');
            }
        }

        this.selectedConnection = connection;
        const path = document.querySelector(
            `[data-connection-id="${connection.id}"] path`
        );
        if (path) {
            path.classList.add('selected');
        }

        // ConnectionManager에 선택 이벤트 발송
        const event = new CustomEvent('connection-selected', { detail: connection });
        document.getElementById('properties').dispatchEvent(event);
    }

    updateConnectionDisplay(connection) {
        const svg = document.querySelector(`[data-connection-id="${connection.id}"]`);
        if (!svg) return;

        // path 업데이트
        const path = svg.querySelector('path');
        if (path) {
            if (connection.identifying) {
                path.setAttribute('stroke-width', '3');
            } else {
                path.setAttribute('stroke-width', '2');
            }
        }

        // text 업데이트
        const text = svg.querySelector('text');
        if (text) {
            const relationSymbol = this.relationTypes.find(t => t.name === connection.type)?.symbol;
            text.textContent = relationSymbol;
        }

        this.saveHistory();
    }

    
    initializeCanvasSize() {
        const canvas = document.getElementById('canvas');
        const canvasArea = document.querySelector('.canvas-area');
        const preset = this.devicePresets[this.currentDevice];
        
        if (canvas && preset) {
            // 캔버스 크기 설정
            canvas.style.width = `${preset.width}px`;
            canvas.style.height = `${preset.height}px`;
            
            // transform 초기화
            canvas.style.transform = 'translate(0, 0) scale(1)';
            canvas.style.transformOrigin = '0 0';
    
            // 캔버스 영역 스크롤 위치를 왼쪽 상단으로 초기화
            if (canvasArea) {
                canvasArea.scrollLeft = 0;
                canvasArea.scrollTop = 0;
            }
    
            // 오프셋 초기화
            this.canvasOffset = { x: 0, y: 0 };
            this.scale = 1;
        }
    }

    // 모바일 접속 체크 메서드 추가
    checkMobileAccess() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            const mobileOverlay = document.createElement('div');
            mobileOverlay.className = 'mobile-overlay';
            mobileOverlay.innerHTML = `
                <div class="mobile-message">
                    <h2>Mobile Device Detected</h2>
                    <p>Sorry, this prototyping tool is currently only supported on desktop environments.</p>
                    <p>For the best experience, please access from a desktop computer.</p>
                    <button class="mobile-close-btn">OK</button>
                </div>
            `;

            document.body.appendChild(mobileOverlay);

            // 확인 버튼 클릭 시 오버레이 제거
            const closeBtn = mobileOverlay.querySelector('.mobile-close-btn');
            closeBtn.addEventListener('click', () => {
                mobileOverlay.remove();
            });
        }
    }

    // 모든 연결선 업데이트
    updateAllConnections() {
        this.connections.forEach(connection => {
            const svg = document.querySelector(`[data-connection-id="${connection.id}"]`);
            if (svg) {
                const line = svg.querySelector('line');
                if (line) {
                    this.updateConnectionPosition(connection, line);
                }
            }
        });
    }


    // transform 원점 유지
    updateCanvasTransform() {
        const canvas = document.getElementById('canvas');
        canvas.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`;
        canvas.style.transformOrigin = '0 0';
        
        // 캔버스 transform이 변경될 때마다 연결선 업데이트
        this.updateAllConnections();
    }

    createPage(pageName) {
        const pageId = Date.now();
        const page = {
            id: pageId,
            name: pageName,
            elements: [],
            device: this.currentDevice,
            gridSize: this.gridSize
        };
        
        this.pages.set(pageId, page);
        
        if (!this.currentPageId) {
            this.currentPageId = pageId;
        }
        
        this.updatePageList();
        return pageId;
    }

    initializeEvents() {
        // 이벤트 위임을 사용하여 컴포넌트 버튼 이벤트 처리
        document.querySelector('.components-panel').addEventListener('click', e => {
            const btn = e.target.closest('.component-btn');
            if (btn) this.addElement(btn.dataset.type);
        });
    
        // 캔버스 이벤트
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('click', e => {
            if (e.target === canvas) this.clearSelection();
        });
    
        // 키보드 이벤트 통합 (단축키 + 방향키)
        const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
        
        document.addEventListener('keydown', e => {
            // 요소가 선택된 상태에서의 키 이벤트
            if (this.selectedElement) {
                // Delete 키 처리
                if (e.key === 'Delete') {
                    this.deleteSelected();
                    return;
                }
    
                // 방향키 처리
                if (ARROW_KEYS.has(e.key)) {
                    e.preventDefault();
                    const moveAmount = e.shiftKey ? 10 : 1;
                    const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
                    
                    // 좌표 업데이트
                    if (e.key === 'ArrowUp') this.selectedElement.y -= moveAmount;
                    else if (e.key === 'ArrowDown') this.selectedElement.y += moveAmount;
                    else if (e.key === 'ArrowLeft') this.selectedElement.x -= moveAmount;
                    else if (e.key === 'ArrowRight') this.selectedElement.x += moveAmount;
                    
                    // DOM 업데이트는 한 번만
                    elementDiv.style.left = `${this.selectedElement.x}px`;
                    elementDiv.style.top = `${this.selectedElement.y}px`;
                    
                    this.updateProperties();
                    
                    // 디바운스된 히스토리 저장
                    if (this.saveTimeout) clearTimeout(this.saveTimeout);
                    this.saveTimeout = setTimeout(() => this.saveHistory(), 500);
                    return;
                }
            }
    
            // Ctrl/Cmd 단축키 처리
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                if (key === 'z' || key === 'y' || key === 'c' || key === 'v') {
                    e.preventDefault();
                    if (key === 'z') this.undo();
                    else if (key === 'y') this.redo();
                    else if (key === 'c') this.copyElement();
                    else if (key === 'v') this.pasteElement();
                }
            }
        });
    
        // 줌과 패닝 이벤트 초기화
        this.initializeZoomAndPan();
    }

    initializeZoomAndPan() {
        const canvasArea = document.querySelector('.canvas-area');
    
        // 줌 이벤트
        canvasArea.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom(delta, e.clientX, e.clientY);
            }
        }, { passive: false });
    
        // 스페이스바 패닝
        let isSpacePressed = false;
        
        // 전체 document에 대한 스페이스바 기본 동작 방지
        document.addEventListener('keydown', (e) => {
            // contentEditable 요소 체크
            const isEditableElement = (
                ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                document.activeElement.isContentEditable || 
                document.activeElement.contentEditable === 'true'
            );
    
            // 편집 가능한 요소가 아닐 때만 스페이스바 기본 동작 방지
            if (e.code === 'Space' && !isEditableElement) {
                e.preventDefault();
            }
        });
    
        document.addEventListener('keydown', (e) => {
            // contentEditable 요소 체크
            const isEditableElement = (
                ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                document.activeElement.isContentEditable || 
                document.activeElement.contentEditable === 'true'
            );
    
            if (e.code === 'Space' && !isSpacePressed && !isEditableElement) {
                isSpacePressed = true;
                canvasArea.classList.add('panning');
                document.body.style.cursor = 'grab';
                this.isPanning = true;
            }
        });
    
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                isSpacePressed = false;
                canvasArea.classList.remove('panning');
                document.body.style.cursor = 'default';
                this.isPanning = false;
            }
        });
    
        // 패닝 마우스 이벤트
        let isPanningActive = false;
        canvasArea.addEventListener('mousedown', (e) => {
            if (this.isPanning) {
                e.preventDefault();
                isPanningActive = true;
                canvasArea.classList.add('panning');
                document.body.style.cursor = 'grabbing';
                this.lastPanPosition = { x: e.clientX, y: e.clientY };
            }
        });
    
        canvasArea.addEventListener('mousemove', (e) => {
            if (isPanningActive && this.isPanning) {
                const dx = e.clientX - this.lastPanPosition.x;
                const dy = e.clientY - this.lastPanPosition.y;
    
                this.canvasOffset.x += dx;
                this.canvasOffset.y += dy;
    
                this.lastPanPosition = { x: e.clientX, y: e.clientY };
                this.updateCanvasTransform();
            }
        });
    
        document.addEventListener('mouseup', () => {
            if (isPanningActive) {
                isPanningActive = false;
                if (this.isPanning) {
                    document.body.style.cursor = 'grab';
                }
            }
        });
    }

    zoom(delta, clientX, clientY) {
        const canvasArea = document.querySelector('.canvas-area');
        const canvas = document.getElementById('canvas');
        const rect = canvasArea.getBoundingClientRect();
    
        // 마우스 위치를 기준으로 줌
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
    
        const newScale = Math.min(Math.max(this.scale * delta, 0.1), 3); // 0.1배에서 3배까지 제한
        
        if (newScale !== this.scale) {
            const scaleChange = newScale / this.scale;
            
            // 마우스 포인터 위치 기준으로 offset 조정
            this.canvasOffset.x = mouseX - (mouseX - this.canvasOffset.x) * scaleChange;
            this.canvasOffset.y = mouseY - (mouseY - this.canvasOffset.y) * scaleChange;
            
            this.scale = newScale;
            this.updateCanvasTransform();
        }
    }

    resetZoom() {
        this.scale = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.updateCanvasTransform();
    }
    
    handlePan = (e) => {
        const dx = e.clientX - this.lastPanPosition.x;
        const dy = e.clientY - this.lastPanPosition.y;
    
        this.canvasOffset.x += dx;
        this.canvasOffset.y += dy;
    
        this.lastPanPosition = { x: e.clientX, y: e.clientY };
        this.updateCanvasTransform();
    }
    
    updateCanvasTransform() {
        const canvas = document.getElementById('canvas');
        canvas.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`;
        canvas.style.transformOrigin = '0 0';
    }


    copyElement() {
        if (!this.selectedElement) return;
        
        // 깊은 복사를 위해 JSON 사용
        this.clipboard = JSON.parse(JSON.stringify(this.selectedElement));
        
        // 복사 성공 피드백 (옵션)
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        if (elementDiv) {
            elementDiv.style.transition = 'transform 0.1s';
            elementDiv.style.transform = 'scale(1.05)';
            setTimeout(() => {
                elementDiv.style.transform = 'scale(1)';
            }, 100);
        }
    }
    
    pasteElement() {
        if (!this.clipboard) return;
        
        // 새로운 ID 생성과 위치 조정
        const newElement = {
            ...this.clipboard,
            id: Date.now(),
            x: this.clipboard.x + 20, // 약간 오프셋을 주어 겹치지 않게
            y: this.clipboard.y + 20,
            zIndex: this.maxZIndex + 1
        };
        
        this.maxZIndex++;
        this.elements.push(newElement);
        this.renderElement(newElement);
        this.selectElement(newElement);
        this.saveHistory();
    }

    // 캔버스 경계선에만 스냅하도록 단순화된 계산
    calculateSnap(x, y, width, height) {
        const canvas = document.getElementById('canvas');
        // 실제 캔버스의 크기를 가져옵니다 (offsetWidth/Height 사용)
        const canvasWidth = parseInt(canvas.style.width);
        const canvasHeight = parseInt(canvas.style.height);
        
        let snappedX = x;
        let snappedY = y;
        const guides = [];
    
        // 왼쪽 경계
        if (Math.abs(x) < this.snapThreshold) {
            snappedX = 0;
            guides.push({ type: 'vertical', position: 0 });
        }
        
        // 오른쪽 경계
        // 요소의 오른쪽 끝이 캔버스 오른쪽 끝과 일치하는지 확인
        if (Math.abs(x + width - canvasWidth) < this.snapThreshold) {
            snappedX = canvasWidth - width;
            guides.push({ type: 'vertical', position: canvasWidth });
        }
        
        // 상단 경계
        if (Math.abs(y) < this.snapThreshold) {
            snappedY = 0;
            guides.push({ type: 'horizontal', position: 0 });
        }
        
        // 하단 경계
        // 요소의 하단이 캔버스 하단과 일치하는지 확인
        if (Math.abs(y + height - canvasHeight) < this.snapThreshold) {
            snappedY = canvasHeight - height;
            guides.push({ type: 'horizontal', position: canvasHeight });
        }
    
        return { x: snappedX, y: snappedY, guides };
    }

    // 요소의 스냅 포인트 계산
    getElementSnapPoints(element) {
        const points = [];
        // 중심점
        points.push({
            x: element.x + element.width / 2,
            y: element.y + element.height / 2
        });
        // 모서리
        points.push({ x: element.x, y: element.y }); // 좌상단
        points.push({ x: element.x + element.width, y: element.y }); // 우상단
        points.push({ x: element.x, y: element.y + element.height }); // 좌하단
        points.push({ x: element.x + element.width, y: element.y + element.height }); // 우하단
        // 중앙선
        points.push({ x: element.x, y: element.y + element.height / 2 }); // 좌중앙
        points.push({ x: element.x + element.width, y: element.y + element.height / 2 }); // 우중앙
        points.push({ x: element.x + element.width / 2, y: element.y }); // 상중앙
        points.push({ x: element.x + element.width / 2, y: element.y + element.height }); // 하중앙
        
        return points;
    }

    // 현재 드래그 중인 요소의 스냅 포인트 계산
    getSnapPoints(element) {
        return this.getElementSnapPoints({
            ...element,
            x: this.draggedElement ? this.draggedElement.x : element.x,
            y: this.draggedElement ? this.draggedElement.y : element.y
        });
    }

    setCanvasSize(deviceType) {
        if (!confirm('Changing canvas size will clear all elements. Continue?')) {
            return;
        }
        const canvas = document.getElementById('canvas');

        if (deviceType === 'custom') {
            const width = prompt('Enter width (px):', '800');
            const height = prompt('Enter height (px):', '600');
            if (width && height) {
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
            }
        } else {
            const size = this.devicePresets[deviceType];
            canvas.style.width = `${size.width}px`;
            canvas.style.height = `${size.height}px`;
        }

        // 모든 요소 초기화
        this.elements = [];
        canvas.innerHTML = '';
        this.selectedElement = null;
        this.updateProperties();
        this.updateLayersList();
        
        // 그리드 설정 유지
        if (this.gridSize > 0) {
            canvas.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
        }

        this.currentDevice = deviceType;
        this.saveHistory();
    }

    // 스냅 가이드라인 표시
    showSnapGuides(guides) {
        // 기존 가이드라인 제거
        document.querySelectorAll('.snap-guide').forEach(guide => guide.remove());
    
        const canvas = document.getElementById('canvas');
        // 실제 캔버스 크기를 가져옵니다.
        const canvasWidth = parseInt(canvas.style.width);
        const canvasHeight = parseInt(canvas.style.height);
    
        guides.forEach(guide => {
            const guideElement = document.createElement('div');
            guideElement.className = 'snap-guide';
            
            if (guide.type === 'vertical') {
                guideElement.style.width = '2px';
                guideElement.style.height = `${canvasHeight}px`;
                // position을 실제 캔버스 크기 기준으로 계산
                guideElement.style.left = `${guide.position}px`;
                guideElement.style.top = '0';
            } else {
                guideElement.style.height = '2px';
                guideElement.style.width = `${canvasWidth}px`;
                guideElement.style.left = '0';
                // position을 실제 캔버스 크기 기준으로 계산
                guideElement.style.top = `${guide.position}px`;
            }
    
            canvas.appendChild(guideElement);
    
            // 1초 후 가이드라인 제거
            setTimeout(() => guideElement.remove(), 1000);
        });
    }

    addElement(type) {
        // BOX 타입일 경우 맨 아래에 생성되도록 zIndex 조정
        let zIndex = this.maxZIndex;
        if (type === 'box') {
            // 모든 요소의 zIndex를 1씩 증가
            this.elements.forEach(element => {
                element.zIndex++;
                const elementDiv = document.getElementById(`element-${element.id}`);
                if (elementDiv) {
                    elementDiv.style.zIndex = element.zIndex;
                }
            });
            zIndex = 1; // box는 항상 맨 아래(1)로 설정
        } else {
            this.maxZIndex++;
        }

        if (type === 'image') {
            this.showImageDialog();
            return;
        }
        if (type === 'table') {
            this.addTableElement();
            return;
        }
        const element = {
            id: Date.now(),
            type,
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            name: this.generateElementName(type),
            content: type === 'icon' ? Object.keys(this.icons)[0] : // 첫 번째 아이콘을 기본값으로
            type === 'sticky' ? 'Double click to edit memo' : type.charAt(0).toUpperCase() + type.slice(1),
            zIndex: this.maxZIndex,
            opacity: type === 'box' ? 0.5 : undefined,
            fontSize: type === 'text' ? 16 : undefined,
            // 패널의 기본 색상 설정
            backgroundColor: type === 'box' ? '#ffffff' : 
                        (type === 'panel' ? '#ffffff' : undefined),
            borderColor: type === 'box' ? '#dddddd' : 
                        (type === 'panel' ? '#dddddd' : undefined),
            showX: type === 'box' ? true : undefined,
            radius: type === 'box' ? 0 : undefined,
            headerColor: type === 'panel' ? '#f5f5f5' : undefined,
            isBold: false,
            stickyColor: type === 'sticky' ? this.stickyColors[0] : undefined,
            targetPageId: null,
            justifyContent: type === 'text' ? 'center' : undefined
        };

        this.elements.push(element);
        this.renderElement(element);
        this.selectElement(element);
        this.saveHistory();
    }

    // 테이블 요소 추가 메서드
    addTableElement() {
        const element = {
            id: Date.now(),
            type: 'table',
            name: this.generateElementName('table'),
            tableName: '',
            x: 100,
            y: 100,
            width: 600,
            height: 400,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    constraints: ['PRIMARY KEY'],
                    description: 'Primary Key'
                }
            ],
            zIndex: this.maxZIndex,
            ...this.tableDefaults
        };
    
        this.elements.push(element);
        this.renderElement(element);
        this.selectElement(element);
        this.saveHistory();
    }

    // 빈 테이블 데이터 생성
    generateEmptyTableData(rows, cols) {
        const data = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                row.push(i === 0 ? `Header ${j + 1}` : `Cell ${i},${j + 1}`);
            }
            data.push(row);
        }
        return data;
    }

    // renderTableElement 메서드 수정
    renderTableElement(element, container) {
        // 기존 컨테이너의 모든 내용을 제거하기 전에 이벤트 리스너도 정리
        if (container.firstChild) {
            const oldElements = container.querySelectorAll('*');
            oldElements.forEach(el => {
                const clonedEl = el.cloneNode(true);
                el.parentNode.replaceChild(clonedEl, el);
            });
            container.innerHTML = '';
        }

        // 테이블 요소의 고유 ID 설정
        const tableId = `table-${element.id}`;
        container.id = tableId;

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = `${element.fontSize}px`;
        table.style.color = element.textColor;

        // 테이블 헤더 컨테이너
        const nameContainer = document.createElement('div');
        nameContainer.className = 'table-header-container';
        nameContainer.style.padding = '8px';
        nameContainer.style.backgroundColor = element.headerBgColor;
        nameContainer.style.color = element.headerTextColor;
        nameContainer.style.fontWeight = 'bold';
        nameContainer.style.borderBottom = `2px solid ${element.borderColor}`;

        // 테이블 이름 입력 필드
        const nameWrapper = document.createElement('div');
        nameWrapper.style.flex = '1';
        nameWrapper.style.display = 'flex';
        nameWrapper.style.alignItems = 'center';
        nameWrapper.style.gap = '8px';

        const nameLabel = document.createElement('span');
        nameLabel.textContent = 'Table Name:';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = element.tableName || '';
        nameInput.placeholder = 'Enter table name';
        nameInput.className = 'table-name-input';

        // 이벤트 리스너에 고유 식별자 추가
        const inputHandler = () => {
            element.tableName = nameInput.value;
            this.saveHistory();
        };
        nameInput.addEventListener('change', inputHandler);

        // Add Column 버튼
        const addColumnBtn = document.createElement('button');
        addColumnBtn.className = 'table-add-column-btn';
        addColumnBtn.innerHTML = '+';
        addColumnBtn.title = 'Add Column';
        
        // 버튼 클릭 이벤트에 고유 식별자 추가
        const addColumnHandler = (e) => {
            e.stopPropagation();
            this.addNewColumn(element);
        };
        addColumnBtn.addEventListener('click', addColumnHandler);

        nameWrapper.appendChild(nameLabel);
        nameWrapper.appendChild(nameInput);
        nameContainer.appendChild(nameWrapper);
        nameContainer.appendChild(addColumnBtn);

        // 테이블 헤더
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Column Name', 'Type', 'Constraints', 'Description'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.padding = `${element.cellPadding}px`;
            th.style.backgroundColor = element.headerBgColor;
            th.style.color = element.headerTextColor;
            th.style.fontWeight = 'bold';
            th.style.borderBottom = `2px solid ${element.borderColor}`;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 테이블 바디
        const tbody = document.createElement('tbody');
        element.columns.forEach((column, rowIndex) => {
            const row = this.createTableRow(element, column, rowIndex);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.appendChild(nameContainer);
        container.appendChild(table);

        // 높이 계산 및 설정
        requestAnimationFrame(() => {
            const totalHeight = nameContainer.offsetHeight + table.offsetHeight;
            element.height = totalHeight + 26;
            const elementDiv = document.getElementById(`element-${element.id}`);
            if (elementDiv) {
                elementDiv.style.height = `${element.height}px`;
            }
        });

        // 요소에 데이터 속성 추가
        container.dataset.tableId = element.id;

        // 연결점 컨테이너 추가
        const connectionPoints = document.createElement('div');
        connectionPoints.className = 'connection-points';
        
        // 상하좌우 연결점 추가
        ['top', 'right', 'bottom', 'left'].forEach(position => {
            const point = document.createElement('div');
            point.className = `connection-point ${position}`;
            point.dataset.position = position;
            point.dataset.tableId = element.id;
            
            // 연결점 드래그 시작
            point.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startConnection(e, element, position);
            });

            connectionPoints.appendChild(point);
        });

        container.appendChild(connectionPoints);
    }

    // 연결 시작
    startConnection(e, sourceElement, position) {
        this.connectionStart = {
            element: sourceElement,
            position: position,
            point: e.target
        };

        // 임시 SVG 라인 생성
        this.createTempLine(e);

        // 마우스 이동 및 업 이벤트 리스너 추가
        document.addEventListener('mousemove', this.handleConnectionDrag);
        document.addEventListener('mouseup', this.handleConnectionEnd);
    }

    // 임시 연결선 생성
    createTempLine(e) {
        const canvas = document.getElementById('canvas');
        
        // SVG 요소 생성
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        
        // 라인 요소 생성
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#2196f3');
        line.setAttribute('stroke-width', '2');
        
        // 시작점 위치 설정
        const rect = this.connectionStart.point.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        const x1 = rect.left + rect.width / 2 - canvasRect.left;
        const y1 = rect.top + rect.height / 2 - canvasRect.top;
        
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x1);
        line.setAttribute('y2', y1);
        
        svg.appendChild(line);
        canvas.appendChild(svg);
        
        this.tempLine = { svg, line };
    }

    // 연결선 드래그 처리
    handleConnectionDrag = (e) => {
        if (!this.tempLine) return;

        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // 마우스 위치로 선 끝점 업데이트
        this.tempLine.line.setAttribute('x2', e.clientX - canvasRect.left);
        this.tempLine.line.setAttribute('y2', e.clientY - canvasRect.top);
    }

    // 연결 종료 처리
    handleConnectionEnd = (e) => {
        // 이벤트 리스너 제거
        document.removeEventListener('mousemove', this.handleConnectionDrag);
        document.removeEventListener('mouseup', this.handleConnectionEnd);

        // 타겟 요소 확인
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.classList.contains('connection-point')) {
            const targetTableId = target.dataset.tableId;
            const targetPosition = target.dataset.position;
            
            // 시작점과 다른 테이블인 경우에만 연결
            if (targetTableId !== this.connectionStart.element.id) {
                this.showRelationDialog(
                    this.connectionStart.element.id,
                    targetTableId,
                    this.connectionStart.position,
                    targetPosition
                );
            }
        }

        // 임시 연결선 제거
        if (this.tempLine) {
            this.tempLine.svg.remove();
            this.tempLine = null;
        }

        this.connectionStart = null;
    }

    // 관계 선택 다이얼로그 표시
    showRelationDialog(sourceId, targetId, sourcePosition, targetPosition) {
        const dialog = document.createElement('div');
        dialog.className = 'relation-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Select Relationship Type</h3>
                <div class="relation-options">
                    ${this.relationTypes.map(type => `
                        <button class="relation-option" data-type="${type.name}">
                            <span class="relation-name">${type.name}</span>
                            <span class="relation-symbol">${type.symbol}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="dialog-buttons">
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
    
        // 관계 유형 선택 시 바로 연결 생성
        dialog.querySelectorAll('.relation-option').forEach(button => {
            button.onclick = () => {
                const relationType = button.dataset.type;
                this.createConnection(
                    sourceId,
                    targetId,
                    sourcePosition,
                    targetPosition,
                    relationType
                );
                document.body.removeChild(dialog);
            };
        });
    
        // 취소 버튼
        dialog.querySelector('.cancel-btn').onclick = () => {
            document.body.removeChild(dialog);
        };
    
        document.body.appendChild(dialog);
    }

    // 실제 연결 생성
    createConnection(sourceId, targetId, sourcePosition, targetPosition, relationType) {
        const connection = {
            id: Date.now(),
            sourceId,
            targetId,
            sourcePosition,
            targetPosition,
            type: relationType
        };

        this.connections.push(connection);
        this.renderConnection(connection);
        this.saveHistory();
    }

    // 연결선 렌더링
    renderConnection(connection) {
        const canvas = document.getElementById('canvas');
        const sourceElement = document.getElementById(`element-${connection.sourceId}`);
        const targetElement = document.getElementById(`element-${connection.targetId}`);
        
        if (!sourceElement || !targetElement) return;
    
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        
        // 시작점과 끝점 계산
        const start = this.orthogonalConnectionManager.getConnectionPoint(connection.sourceId, connection.sourcePosition);
        const end = this.orthogonalConnectionManager.getConnectionPoint(connection.targetId, connection.targetPosition);
        
        if (!start || !end) return;
    
        // 경로 계산
        const points = this.orthogonalConnectionManager.calculateOrthogonalPath(start, end);
        const pathD = this.orthogonalConnectionManager.createSvgPath(points);
    
        // 연결선 생성
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('stroke', connection.color || '#2196f3');
        path.setAttribute('stroke-width', connection.strokeWidth || 2);
        path.setAttribute('fill', 'none');
        path.style.pointerEvents = 'all';
        path.style.cursor = 'pointer';
        
        // 관계 타입 레이블 생성
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.style.pointerEvents = 'all';
        text.style.cursor = 'pointer';
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('alignment-baseline', 'middle');
        text.setAttribute('fill', '#2196f3');
        text.setAttribute('font-size', '12');
        
        // 레이블 위치 계산 (경로의 중간점)
        const midPoint = this.orthogonalConnectionManager.getMidPoint(points);
        text.setAttribute('x', midPoint.x);
        text.setAttribute('y', midPoint.y);
        
        const relationSymbol = this.relationTypes.find(t => t.name === connection.type)?.symbol || '';
        text.textContent = relationSymbol;
        
        // SVG에 요소 추가
        svg.appendChild(path);
        svg.appendChild(text);
        canvas.appendChild(svg);
    
        // SVG 요소에 connection ID 추가
        svg.dataset.connectionId = connection.id;
        path.dataset.connectionId = connection.id;
        text.dataset.connectionId = connection.id;
    
        // 이벤트 리스너 추가
        const handleClick = (e) => {
            e.stopPropagation();
            this.connectionManager.selectConnection(connection);
        };
    
        const handleDblClick = (e) => {
            e.stopPropagation();
            this.connectionManager.showRelationEditDialog(connection);
        };
    
        [path, text].forEach(element => {
            element.addEventListener('click', handleClick);
            element.addEventListener('dblclick', handleDblClick);
        });
    
        // 첫 렌더링 후 연결선 업데이트 트리거
        requestAnimationFrame(() => {
            this.orthogonalConnectionManager.updateConnection(connection);
        });
    }

    // 연결선 위치 업데이트
    updateConnectionPosition(connection, path) {
        const sourcePoint = this.orthogonalConnectionManager.getConnectionPoint(connection.sourceId, connection.sourcePosition);
        const targetPoint = this.orthogonalConnectionManager.getConnectionPoint(connection.targetId, connection.targetPosition);
        
        if (!sourcePoint || !targetPoint) return;

        const points = this.orthogonalConnectionManager.calculateOrthogonalPath(sourcePoint, targetPoint);
        const pathD = this.orthogonalConnectionManager.createSvgPath(points);
        
        // 경로 업데이트
        path.setAttribute('d', pathD);
    
        // 레이블 위치 업데이트
        const labelElement = path.parentElement?.querySelector('text');
        if (labelElement) {
            // 중간점 계산
            const midPoint = this.connectionManager.getMidPoint(points);
            labelElement.setAttribute('x', midPoint.x);
            labelElement.setAttribute('y', midPoint.y);
            
            // 레이블 방향 조정
            const angle = this.calculateLabelAngle(points);
            if (angle !== 0) {
                labelElement.setAttribute('transform', `rotate(${angle} ${midPoint.x} ${midPoint.y})`);
            } else {
                labelElement.removeAttribute('transform');
            }
        }
    }

    calculateLabelAngle(points) {
        const midIndex = Math.floor(points.length / 2);
        const p1 = points[midIndex - 1];
        const p2 = points[midIndex];
        
        // 수평선인 경우 0도, 수직선인 경우 -90도
        if (p1[0] === p2[0]) { // 수직선
            return -90;
        }
        return 0;
    }

    // 연결점 위치 계산
    getConnectionPoint(elementId, position) {
        const element = document.getElementById(`element-${elementId}`);
        if (!element) return null;
    
        const rect = element.getBoundingClientRect();
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
    
        // 캔버스의 현재 transform 상태를 고려한 좌표 계산
        const x = (rect.left - canvasRect.left) / this.scale - this.canvasOffset.x / this.scale;
        const y = (rect.top - canvasRect.top) / this.scale - this.canvasOffset.y / this.scale;
        const width = rect.width / this.scale;
        const height = rect.height / this.scale;
    
        // 각 위치에 따른 연결점 좌표 반환
        switch (position) {
            case 'top':
                return {
                    x: x + width / 2,
                    y: y
                };
            case 'right':
                return {
                    x: x + width,
                    y: y + height / 2
                };
            case 'bottom':
                return {
                    x: x + width / 2,
                    y: y + height
                };
            case 'left':
                return {
                    x: x,
                    y: y + height / 2
                };
        }
    }

    // 관계 타입 레이블 추가
    addRelationshipLabel(connection, svg) {
        const sourcePoint = this.getConnectionPoint(connection.sourceId, connection.sourcePosition);
        const targetPoint = this.getConnectionPoint(connection.targetId, connection.targetPosition);
        
        if (!sourcePoint || !targetPoint) return;

        // 레이블 위치 계산 (선의 중간 지점)
        const x = (sourcePoint.x + targetPoint.x) / 2;
        const y = (sourcePoint.y + targetPoint.y) / 2;

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('alignment-baseline', 'middle');
        text.setAttribute('fill', '#2196f3');
        text.setAttribute('font-size', '12');
        text.textContent = this.relationTypes.find(t => t.name === connection.type)?.symbol || '';

        svg.appendChild(text);
    }

    // 연결선 삭제 기능 추가
    deleteConnection(connectionId) {
        const connection = this.connections.find(c => c.id === connectionId);
        if (connection) {
            // SVG 요소 제거
            document.querySelector(`[data-connection-id="${connectionId}"]`)?.remove();
            // 배열에서 제거
            this.connections = this.connections.filter(c => c.id !== connectionId);
            this.saveHistory();
        }
    }

    // 연결선 편집 기능
    editConnection(connectionId) {
        const connection = this.connections.find(c => c.id === connectionId);
        if (connection) {
            this.showRelationDialog(
                connection.sourceId,
                connection.targetId,
                connection.sourcePosition,
                connection.targetPosition,
                true
            );
        }
    }

    // 연결선 스타일 설정
    setConnectionStyle(connectionId, style) {
        const connection = this.connections.find(c => c.id === connectionId);
        if (connection) {
            const line = document.querySelector(`[data-connection-id="${connectionId}"] line`);
            if (line) {
                Object.assign(line.style, style);
            }
            this.saveHistory();
        }
    }

    // 연결선 자동 정렬
    autoLayoutConnections() {
        this.connections.forEach(connection => {
            const sourcePoint = this.getConnectionPoint(connection.sourceId, connection.sourcePosition);
            const targetPoint = this.getConnectionPoint(connection.targetId, connection.targetPosition);
            if (sourcePoint && targetPoint) {
                this.updateConnectionPosition(connection);
            }
        });
    }

    // 테이블 행 생성을 별도의 메서드로 분리
    createTableRow(element, column, rowIndex) {
        const row = document.createElement('tr');
        row.className = 'table-row';
        row.dataset.rowIndex = rowIndex;

        // 컬럼명 셀
        const nameCell = this.createEditableCell(element, column, 'name', rowIndex);
        
        // 타입 셀
        const typeCell = this.createTypeCell(element, column, rowIndex);
        
        // 제약조건 셀
        const constraintsCell = this.createConstraintsCell(element, column, rowIndex);
        
        // 설명 셀
        const descriptionCell = this.createEditableCell(element, column, 'description', rowIndex);

        // 삭제 버튼
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'column-delete-btn';
        deleteBtn.innerHTML = 'x';
        deleteBtn.title = 'Delete Column';
        
        // 삭제 버튼 이벤트 핸들러
        const deleteHandler = (e) => {
            e.stopPropagation();
            if (confirm('Delete this column?')) {
                element.columns.splice(rowIndex, 1);
                // 테이블 전체를 다시 렌더링하는 대신 현재 행만 제거
                row.remove();
                // 높이 재계산
                this.updateTableHeight(element);
                this.saveHistory();
            }
        };
        deleteBtn.addEventListener('click', deleteHandler);

        nameCell.style.position = 'relative';
        nameCell.appendChild(deleteBtn);

        row.appendChild(nameCell);
        row.appendChild(typeCell);
        row.appendChild(constraintsCell);
        row.appendChild(descriptionCell);

        return row;
    }

    // 테이블 높이 업데이트를 위한 새로운 메서드
    updateTableHeight(element) {
        const elementDiv = document.getElementById(`element-${element.id}`);
        if (elementDiv) {
            const container = elementDiv.querySelector('.table-container');
            if (container) {
                const nameContainer = container.querySelector('.table-header-container');
                const table = container.querySelector('table');
                const totalHeight = nameContainer.offsetHeight + table.offsetHeight;
                element.height = totalHeight + 20;
                elementDiv.style.height = `${element.height}px`;
            }
        }
    }

    createEditableCell(element, column, property, rowIndex) {
        const cell = document.createElement('td');
        cell.style.padding = `${element.cellPadding}px`;
        cell.style.border = `1px solid ${element.borderColor}`;
        cell.style.backgroundColor = element.cellBgColor;
        cell.textContent = column[property];
    
        cell.addEventListener('dblclick', () => {
            if (this.previewMode) return;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = column[property];
            input.style.width = '100%';
            input.style.padding = '4px';
            input.style.border = 'none';
            input.style.outline = 'none';
            
            cell.textContent = '';
            cell.appendChild(input);
            input.focus();
    
            input.addEventListener('blur', () => {
                column[property] = input.value;
                cell.textContent = input.value;
                this.saveHistory();
            });
    
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });
    
        return cell;
    }

    // 타입 선택 셀 생성
    createTypeCell(element, column, rowIndex) {
        const cell = document.createElement('td');
        cell.style.padding = `${element.cellPadding}px`;
        cell.style.border = `1px solid ${element.borderColor}`;
        cell.style.backgroundColor = element.cellBgColor;

        const select = document.createElement('select');
        select.style.width = '100%';
        select.style.padding = '4px';
        select.style.border = 'none';
        select.style.outline = 'none';
        select.style.backgroundColor = 'transparent';

        this.dbColumnTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            option.selected = column.type === type;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            column.type = select.value;
            this.saveHistory();
        });

        cell.appendChild(select);
        return cell;
    }

    // 제약조건 셀 생성
    createConstraintsCell(element, column, rowIndex) {
        const cell = document.createElement('td');
        cell.style.padding = `${element.cellPadding}px`;
        cell.style.border = `1px solid ${element.borderColor}`;
        cell.style.backgroundColor = element.cellBgColor;
        cell.className = 'constraints-cell';
    
        const constraintsContainer = document.createElement('div');
        constraintsContainer.className = 'constraints-container';
        constraintsContainer.style.display = 'flex';
        constraintsContainer.style.flexWrap = 'wrap';
        constraintsContainer.style.gap = '4px';
    
        // 제약조건 배지들 생성
        this.renderConstraintBadges(constraintsContainer, element, column, rowIndex);
    
        // 제약조건 추가 버튼
        const addButton = document.createElement('button');
        addButton.textContent = '+';
        addButton.className = 'add-constraint-btn';
        addButton.onclick = (e) => {
            e.stopPropagation();
            this.showConstraintDialog(element, column, rowIndex, constraintsContainer);
        };
    
        constraintsContainer.appendChild(addButton);
        cell.appendChild(constraintsContainer);
        return cell;
    }

    renderConstraintBadges(container, element, column, rowIndex) {
        // 기존 배지들 제거
        container.querySelectorAll('.constraint-badge').forEach(badge => badge.remove());
    
        column.constraints.forEach((constraint, constraintIndex) => {
            const badge = document.createElement('div');
            badge.className = 'constraint-badge';
            badge.style.backgroundColor = '#BAD7E9';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '12px';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.gap = '4px';
    
            const text = document.createElement('span');
            text.textContent = constraint;
            badge.appendChild(text);
    
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'remove-constraint-btn';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                column.constraints.splice(constraintIndex, 1);
                badge.remove();
                this.saveHistory();
            };
    
            badge.appendChild(removeBtn);
            container.insertBefore(badge, container.lastChild); // 추가 버튼 앞에 삽입
        });
    }

    // 제약조건 배지 생성
    createConstraintBadge(constraint, onRemove) {
        const badge = document.createElement('div');
        badge.className = 'constraint-badge';
        badge.style.backgroundColor = '#BAD7E9';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '12px';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '4px';

        const text = document.createElement('span');
        text.textContent = constraint;
        badge.appendChild(text);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-constraint-btn';
        removeBtn.onclick = onRemove;
        badge.appendChild(removeBtn);

        return badge;
    }

    // 제��조건 선택 다이얼로그 표시
    showConstraintDialog(element, column, rowIndex, constraintsContainer) {
        const dialog = document.createElement('div');
        dialog.className = 'constraint-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        dialog.style.zIndex = '1000';
    
        const availableConstraints = this.dbConstraints.filter(c => !column.constraints.includes(c));
    
        dialog.innerHTML = `
            <h3>Add Constraint</h3>
            <div class="constraint-options">
                ${availableConstraints.map(c => `
                    <button class="constraint-option" data-constraint="${c}">
                        ${c}
                    </button>
                `).join('')}
            </div>
        `;
    
        // 제약조건 선택 이벤트
        dialog.querySelectorAll('.constraint-option').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation();
                const constraint = button.dataset.constraint;
                
                // 제약조건 배열에 추가
                column.constraints.push(constraint);
                
                // 제약조건 컨테이너만 업데이트
                this.renderConstraintBadges(constraintsContainer, element, column, rowIndex);
                
                this.saveHistory();
                document.body.removeChild(dialog);
            };
        });
    
        // 다이얼로그 외부 클릭 시 닫기
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    
        // ESC 키로 닫기
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    
        document.body.appendChild(dialog);
    }
    

    // 새 컬럼 추가
    addNewColumn(element) {
        element.columns.push({
            name: `column${element.columns.length + 1}`,
            type: 'VARCHAR',
            constraints: [],
            description: ''
        });

        // 기존 테이블을 직접 업데이트
        const elementDiv = document.getElementById(`element-${element.id}`);
        const container = elementDiv.querySelector('.table-container');
        if (container) {
            this.renderTableElement(element, container);
        }
        
        this.saveHistory();
    }


    handleImageUpload(file) {
        return new Promise((resolve, reject) => {
            // 파일 타입 체크
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Please select an image file.'));
                return;
            }
    
            // 파일 크기 체크 (1MB = 1048576 bytes)
            const maxSize = 1 * 1048576; // 1MB
            if (file.size > maxSize) {
                reject(new Error('Image size must be less than 1MB. Please compress your image and try again.'));
                return;
            }
    
            const reader = new FileReader();
            
            reader.onload = () => {
                const tempImage = new Image();
                tempImage.onload = () => {
                    // 이미지 크기 제한 (예: 최대 500x500)
                    const maxDimension = 500;
                    let width = tempImage.width;
                    let height = tempImage.height;
    
                    if (width > maxDimension || height > maxDimension) {
                        const ratio = Math.min(maxDimension / width, maxDimension / height);
                        width *= ratio;
                        height *= ratio;
                    }
    
                    const element = {
                        id: Date.now(),
                        type: 'image',
                        x: 100,
                        y: 100,
                        width: width,
                        height: height,
                        name: this.generateElementName('image'),
                        content: reader.result,
                        aspectRatio: tempImage.width / tempImage.height,
                        zIndex: this.maxZIndex
                    };
                    resolve(element);
                };
    
                tempImage.onerror = () => {
                    reject(new Error('Failed to load image.'));
                };
    
                tempImage.src = reader.result;
            };
    
            reader.onerror = () => {
                reject(new Error('Failed to read file.'));
            };
    
            reader.readAsDataURL(file);
        });
    }

    generateElementName(type) {
        const counts = this.elements.reduce((acc, el) => {
            if (el.type === type) {
                acc[type] = (acc[type] || 0) + 1;
            }
            return acc;
        }, {});
        
        const count = (counts[type] || 0) + 1;
        
        switch(type) {
            case 'text':
                return `Text ${count}`;
            case 'box':
                return `Box ${count}`;
            case 'sticky':
                return `Note ${count}`;
            case 'image':
                return `Image ${count}`;
            default:
                return `Element ${count}`;
        }
    }

    showImageDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'image-dialog';
        dialog.innerHTML = `
            <div class="image-dialog-content">
                <h3>Add Image</h3>
                <div class="image-input-group">
                    <label>Select Image File:</label>
                    <small style="display: block; color: #666; margin-bottom: 8px;">
                        File size must be less than 1MB
                    </small>
                    <input type="file" accept="image/*" class="image-file-input">
                </div>
                <div class="dialog-buttons">
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
    
        document.body.appendChild(dialog);
    
        const fileInput = dialog.querySelector('.image-file-input');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const element = await this.handleImageUpload(file);
                    this.elements.push(element);
                    this.renderElement(element);
                    this.selectElement(element);
                    this.saveHistory();
                    document.body.removeChild(dialog);
                } catch (error) {
                    alert(error.message);
                }
            }
        });
    
        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }
    
    createImageElement(src) {
        const element = {
            id: Date.now(),
            type: 'image',
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            content: src,
            zIndex: this.maxZIndex,
            aspectRatio: null // 이미지 비율 보존을 위해 추가
        };

        // 이미지 로드 후 비율 계산
        const img = new Image();
        img.onload = () => {
            element.aspectRatio = img.width / img.height;
            element.height = element.width / element.aspectRatio;
            this.renderElement(element);
            this.updateProperties();
        };
        img.src = src;

        this.elements.push(element);
        this.selectElement(element);
        this.saveHistory();
    }

    renderElement(element) {
        const div = document.createElement('div');
        div.id = `element-${element.id}`;
        div.className = `element ${element.type}`;
        
        // 공통 스타일 적용
        Object.assign(div.style, {
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            zIndex: element.zIndex || 1
        });
    
        // 요소 타입별 렌더링
        const elementContent = {
            image: () => {
                const img = document.createElement('img');
                Object.assign(img, {
                    src: element.content,
                    style: 'width: 100%; height: 100%; object-fit: contain;',
                    draggable: false,
                    alt: 'Uploaded image'
                });
                return img;
            },
            
            box: () => {
                const innerContainer = document.createElement('div');
                innerContainer.style.width = '100%';
                innerContainer.style.height = '100%';
                innerContainer.style.borderRadius = `${element.radius || 0}px`;
                innerContainer.style.backgroundColor = element.backgroundColor || '#ffffff';
                innerContainer.style.border = `1px solid ${element.borderColor || '#dddddd'}`;
                innerContainer.style.overflow = 'hidden';
                innerContainer.style.position = 'absolute';
                innerContainer.style.top = '0';
                innerContainer.style.left = '0';
                
                // 원래 div의 테두리와 배경색 제거
                div.style.border = 'none';
                div.style.background = 'none';
                
                return innerContainer;
            },
            
            sticky: () => {
                div.style.backgroundColor = element.stickyColor;
                const content = document.createElement('div');
                content.className = 'sticky-content';
                content.style.fontSize = `${element.fontSize}px`;
                content.textContent = element.content;
                
                // 더블클릭 이벤트 처리
                const handleDblClick = e => {
                    e.stopPropagation();
                    if (!e.target.closest('.resize-handle')) {
                        this.startEditingSticky(element);
                    }
                };
                
                div.addEventListener('dblclick', handleDblClick);
                content.addEventListener('dblclick', handleDblClick);
                
                return content;
            },
        
            
            text: () => {
                div.textContent = element.content;
                if (element.fontSize) div.style.fontSize = `${element.fontSize}px`;
                if (element.isBold) div.style.fontWeight = 'bold';
                div.style.justifyContent = element.justifyContent || 'center';
                
                div.addEventListener('dblclick', e => {
                    e.stopPropagation();
                    this.startEditing(element);
                });
                
                return null;
            },
            

            table: () => {
                // 드래그 중인 경우 기존 컨테이너 재사용
                const existingContainer = document.querySelector(`#element-${element.id} .table-container`);
                if (existingContainer && this.draggedElement === element) {
                    return existingContainer;
                }
                
                // 새 컨테이너 생성
                const container = document.createElement('div');
                container.className = 'table-container';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.overflow = 'auto';
                
                // 테이블 렌더링
                this.renderTableElement(element, container);
                
                return container;
            },
            
        };
    
        // 요소 타입별 콘텐츠 생성 및 추가
        const content = elementContent[element.type]?.();
        if (content) div.appendChild(content);
    
        // 공통 이벤트 리스너 추가
        div.addEventListener('mousedown', e => {
            if (!this.previewMode && !e.target.classList.contains('panel-close') && !e.target.classList.contains('resize-handle')) {
                this.startDragging(e, element);
            }
        });
    
        div.addEventListener('click', e => {
            if (!this.previewMode && !e.target.classList.contains('panel-close')) {
                e.stopPropagation();
                this.selectElement(element);
            }
        });
    
        document.getElementById('canvas').appendChild(div);
        this.updateLayersList();
    }

    startEditing(element) {
        if (element.type !== 'text') return;
        
        const elementDiv = document.getElementById(`element-${element.id}`);
        const currentText = element.content;
        
        elementDiv.innerHTML = '';
        const editableDiv = document.createElement('div');
        editableDiv.contentEditable = true;
        editableDiv.className = 'editable-text';
        editableDiv.textContent = currentText;
        editableDiv.style.width = '100%';
        editableDiv.style.height = '100%';
        editableDiv.style.outline = 'none';
        editableDiv.style.justifyContent = element.justifyContent || 'center';
        editableDiv.style.fontSize = element.fontSize ? `${element.fontSize}px` : '16px';
        
        elementDiv.appendChild(editableDiv);
        
        // 텍스트 선택
        const range = document.createRange();
        range.selectNodeContents(editableDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        editableDiv.focus();

        // Ctrl+B 단축키 처리
        editableDiv.addEventListener('keydown', (e) => {
            if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.toggleBold();
                // 편집 중인 div에도 볼드 상태 적용
                editableDiv.style.fontWeight = element.isBold ? 'bold' : 'normal';
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                editableDiv.blur();
            }
        });

        // 편집 완료 처리
        const finishEditing = () => {
            const newText = editableDiv.textContent;
            element.content = newText;
            elementDiv.textContent = newText;
            // 볼드 상태 유지
            elementDiv.style.fontWeight = element.isBold ? 'bold' : 'normal';
            this.saveHistory();
        };

        editableDiv.addEventListener('blur', finishEditing);
        
        editableDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                editableDiv.blur();
            }
        });
    }

    startEditingTableCell(tableElement, row, col, cellElement) {
        // 이미 편집 중인지 확인
        if (cellElement.querySelector('input')) return;
    
        const input = document.createElement('input');
        input.type = 'text';
        input.value = tableElement.data[row][col];
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.padding = `${tableElement.cellPadding}px`;
        input.style.border = 'none';
        input.style.backgroundColor = 'white';
        input.style.fontSize = `${tableElement.fontSize}px`;
        input.style.fontWeight = row === 0 ? tableElement.headerFontWeight : tableElement.cellFontWeight;
    
        const originalContent = cellElement.textContent;
        cellElement.textContent = '';
        cellElement.appendChild(input);
        input.focus();
    
        const finishEditing = (save) => {
            if (!cellElement.contains(input)) return; // 이미 제거됐는지 확인
            
            const newValue = input.value;
            if (save) {
                tableElement.data[row][col] = newValue;
                cellElement.textContent = newValue;
                this.saveHistory();
            } else {
                cellElement.textContent = originalContent;
            }
        };
    
        input.addEventListener('blur', () => finishEditing(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                finishEditing(false);
            }
        });
    }

    startEditingSticky(element) {
        const elementDiv = document.getElementById(`element-${element.id}`);
        const contentDiv = elementDiv.querySelector('.sticky-content');
        
        // 이미 편집 중인 경우 리턴
        if (contentDiv.contentEditable === 'true') return;
        
        // contentEditable 속성 추가
        contentDiv.contentEditable = true;
        contentDiv.classList.add('editable');
        
        // 포커스 및 텍스트 선택
        contentDiv.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(contentDiv);
        selection.removeAllRanges();
        selection.addRange(range);
    
        const finishEditing = () => {
            contentDiv.contentEditable = false;
            contentDiv.classList.remove('editable');
            element.content = contentDiv.textContent || element.content;
            this.saveHistory();
            this.updateProperties();
        };
    
        // blur와 Ctrl+Enter로 편집 완료
        contentDiv.addEventListener('blur', finishEditing, { once: true });
        contentDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                contentDiv.blur();
            }
        });
    }

    toggleBold() {
        if (!this.selectedElement || this.selectedElement.type !== 'text') return;
        
        this.selectedElement.isBold = !this.selectedElement.isBold;
        
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        if (elementDiv) {
            elementDiv.style.fontWeight = this.selectedElement.isBold ? 'bold' : 'normal';
        }
        
        this.updateProperties();
        this.saveHistory();
    }

    startDragging(e, element) {
        this.draggedElement = element;
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        this.offset = {
            x: ((e.clientX - canvasRect.left - this.canvasOffset.x) / this.scale) - element.x,
            y: ((e.clientY - canvasRect.top - this.canvasOffset.y) / this.scale) - element.y
        };
    
        const moveHandler = (e) => this.handleDrag(e);
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            this.draggedElement = null;
            this.saveHistory();
        };
    
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    handleDrag(e) {
        if (!this.draggedElement) return;
    
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        
        let x = (e.clientX - rect.left - this.canvasOffset.x) / this.scale - this.offset.x;
        let y = (e.clientY - rect.top - this.canvasOffset.y) / this.scale - this.offset.y;
    
        if (this.gridSize > 0) {
            x = Math.round(x / this.gridSize) * this.gridSize;
            y = Math.round(y / this.gridSize) * this.gridSize;
        }
    
        if (this.snapEnabled) {
            const snapResult = this.calculateSnap(
                x, 
                y, 
                this.draggedElement.width, 
                this.draggedElement.height
            );
            x = snapResult.x;
            y = snapResult.y;
            
            this.showSnapGuides(snapResult.guides);
        }
    
        this.draggedElement.x = Math.max(0, x);
        this.draggedElement.y = Math.max(0, y);
    
        const elementDiv = document.getElementById(`element-${this.draggedElement.id}`);
        if (elementDiv) {
            elementDiv.style.left = `${this.draggedElement.x}px`;
            elementDiv.style.top = `${this.draggedElement.y}px`;
    
            // 모든 연결선 업데이트
            this.connections.forEach(connection => {
                this.orthogonalConnectionManager.updateConnection(connection);
            });
        }
    
        this.updateProperties();
    }
    
    
    selectElement(element) {
        this.clearSelection();  // 먼저 이전 선택을 모두 해제
        this.selectedElement = element;
        const div = document.getElementById(`element-${element.id}`);
        div.classList.add('selected');  // 현재 요소에 'selected' 클래스 추가
        this.updateProperties();
        this.updateLayersList();
        this.addResizeHandles(div);  // 필요한 경우 리사이즈 핸들 추가
    }

    addResizeHandles(elementDiv) {
        // 기존 핸들 제거
        elementDiv.querySelectorAll('.resize-handle').forEach(handle => handle.remove());

        // 8방향 리사이즈 핸들 추가
        const positions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResizing(e, this.selectedElement, pos);
            });
            elementDiv.appendChild(handle);
        });
    }

    startResizing(e, element, handle) {
        this.resizingElement = element;
        this.resizeHandle = handle;
        this.startSize = {
            width: element.width,
            height: element.height,
            x: element.x,
            y: element.y
        };
        this.startPos = {
            x: e.clientX,
            y: e.clientY
        };

        const moveHandler = (e) => this.handleResize(e);
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            this.resizingElement = null;
            this.resizeHandle = null;
            this.saveHistory();
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    handleResize(e) {
        if (!this.resizingElement) return;

        // 마우스 이동 거리를 scale로 나누어 실제 이동 거리 계산
        const dx = (e.clientX - this.startPos.x) / this.scale;
        const dy = (e.clientY - this.startPos.y) / this.scale;
        
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const guides = [];

        // 초기 값 설정
        let newWidth = this.startSize.width;
        let newHeight = this.startSize.height;
        let newX = this.startSize.x;
        let newY = this.startSize.y;

        // 리사이즈 핸들 방향 분해
        const directions = this.resizeHandle.split('');
        
        // 각 방향별로 계산 수행
        directions.forEach(direction => {
            switch(direction) {
                case 'e':
                    newWidth = Math.max(50, this.startSize.width + dx);
                    if (this.snapEnabled && Math.abs(newX + newWidth - canvasRect.width/this.scale) < this.snapThreshold) {
                        newWidth = canvasRect.width/this.scale - newX;
                        guides.push({ type: 'vertical', position: canvasRect.width });
                    }
                    break;
                case 'w':
                    const newWidthW = Math.max(50, this.startSize.width - dx);
                    const possibleX = this.startSize.x + (this.startSize.width - newWidthW);
                    if (this.snapEnabled && Math.abs(possibleX) < this.snapThreshold) {
                        newX = 0;
                        newWidth = this.startSize.x + this.startSize.width;
                        guides.push({ type: 'vertical', position: 0 });
                    } else {
                        newX = possibleX;
                        newWidth = newWidthW;
                    }
                    break;
                case 's':
                    newHeight = Math.max(30, this.startSize.height + dy);
                    if (this.snapEnabled && Math.abs(newY + newHeight - canvasRect.height/this.scale) < this.snapThreshold) {
                        newHeight = canvasRect.height/this.scale - newY;
                        guides.push({ type: 'horizontal', position: canvasRect.height });
                    }
                    break;
                case 'n':
                    const newHeightN = Math.max(30, this.startSize.height - dy);
                    const possibleY = this.startSize.y + (this.startSize.height - newHeightN);
                    if (this.snapEnabled && Math.abs(possibleY) < this.snapThreshold) {
                        newY = 0;
                        newHeight = this.startSize.y + this.startSize.height;
                        guides.push({ type: 'horizontal', position: 0 });
                    } else {
                        newY = possibleY;
                        newHeight = newHeightN;
                    }
                    break;
            }
        });

        // 이미지 비율 유지 처리
        if (this.resizingElement.type === 'image' && this.resizingElement.aspectRatio && !e.shiftKey) {
            if (directions.some(d => ['e', 'w'].includes(d))) {
                newHeight = newWidth / this.resizingElement.aspectRatio;
            } else if (directions.some(d => ['n', 's'].includes(d))) {
                newWidth = newHeight * this.resizingElement.aspectRatio;
            }
        }

        // 그리드 스냅 처리
        if (this.gridSize > 0) {
            newWidth = Math.round(newWidth / this.gridSize) * this.gridSize;
            newHeight = Math.round(newHeight / this.gridSize) * this.gridSize;
            newX = Math.round(newX / this.gridSize) * this.gridSize;
            newY = Math.round(newY / this.gridSize) * this.gridSize;
        }

        // 요소 업데이트
        Object.assign(this.resizingElement, {
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY
        });
        
        const elementDiv = document.getElementById(`element-${this.resizingElement.id}`);
        Object.assign(elementDiv.style, {
            width: `${newWidth}px`,
            height: `${newHeight}px`,
            left: `${newX}px`,
            top: `${newY}px`
        });

        this.showSnapGuides(guides);
        this.updateProperties();
    }

    updateProperties() {
        const propertiesDiv = document.getElementById('properties');
        
        if (!this.selectedElement) {
            propertiesDiv.innerHTML = '<p>No element selected</p>';
            return;
        }
    
        // 각 요소 타입별 특수 컨트롤 생성 함수
        const specialControls = {
            box: (element) => ({
                title: 'Box Style',
                html: `
                    <div class="box-controls">
                        ${this.createColorControl('Background', element.backgroundColor, 'backgroundColor')}
                        ${this.createColorControl('Border', element.borderColor, 'borderColor')}
                        <div class="control-group">
                            <label>Border Radius</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value="${element.radius || 0}"
                                onchange="tool.updateBoxStyle('radius', this.value)"
                                class="radius-slider">
                            <span>${element.radius || 0}px</span>
                        </div>
                        <div class="control-group">
                            <label>Opacity</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value="${element.opacity || 1}"
                                onchange="tool.updateBoxStyle('opacity', this.value)"
                                class="opacity-slider">
                            <span>${Math.round((element.opacity || 1) * 100)}%</span>
                        </div>
                    </div>
                `,
                handler: 'updateBoxStyle'
            }),
    
            text: (element) => ({
                title: 'Text Style',
                html: `
                    <div class="text-controls">
                        <button 
                            class="style-button ${element.isBold ? 'active' : ''}"
                            onclick="tool.toggleBold()"
                            title="Bold">
                            <b>B</b>
                        </button>
                        <input type="number" 
                            class="property-input" 
                            value="${element.fontSize || 16}"
                            onchange="tool.updateFontSize(this.value)"
                            style="width: 60px">
                        <div class="text-align-controls">
                            ${this.createAlignButton('start', element)}
                            ${this.createAlignButton('center', element)}
                            ${this.createAlignButton('end', element)}
                        </div>
                    </div>
                `
            }),
    
            sticky: (element) => ({
                title: 'Sticky Style',
                html: `
                    <div class="sticky-colors">
                        ${this.stickyColors.map(color => `
                            <button 
                                class="color-button ${element.stickyColor === color ? 'active' : ''}"
                                style="background-color: ${color}"
                                onclick="tool.updateStickyColor('${color}')"
                            ></button>
                        `).join('')}
                    </div>
                    ${this.createStickyControls(element)}
                `
            }),

            table: (element) => ({
                title: 'Table Style',
                html: `
                    <div class="table-controls">
                        <div class="control-group">
                            <label>Rows</label>
                            <input type="number" 
                                min="1" 
                                max="20" 
                                value="${element.rows}"
                                onchange="tool.updateTableStructure(this.value, 'rows')">
                        </div>
                        <div class="control-group">
                            <label>Columns</label>
                            <input type="number" 
                                min="1" 
                                max="10" 
                                value="${element.cols}"
                                onchange="tool.updateTableStructure(this.value, 'cols')">
                        </div>
                        <div class="control-group">
                            <label>Cell Padding</label>
                            <input type="number"
                                min="0"
                                max="20"
                                value="${element.cellPadding}"
                                onchange="tool.updateTableStyle('cellPadding', this.value)">
                        </div>
                        <div class="control-group">
                            <label>Font Size</label>
                            <input type="number"
                                min="8"
                                max="24"
                                value="${element.fontSize}"
                                onchange="tool.updateTableStyle('fontSize', this.value)">
                        </div>
                        <div class="color-controls">
                            <div class="color-control">
                                <label>Border Color</label>
                                <input type="color" 
                                    value="${element.borderColor}"
                                    onchange="tool.updateTableStyle('borderColor', this.value)">
                            </div>
                            <div class="color-control">
                                <label>Header Background</label>
                                <input type="color" 
                                    value="${element.headerBgColor}"
                                    onchange="tool.updateTableStyle('headerBgColor', this.value)">
                            </div>
                            <div class="color-control">
                                <label>Cell Background</label>
                                <input type="color" 
                                    value="${element.cellBgColor}"
                                    onchange="tool.updateTableStyle('cellBgColor', this.value)">
                            </div>
                            <div class="color-control">
                                <label>Text Color</label>
                                <input type="color" 
                                    value="${element.textColor}"
                                    onchange="tool.updateTableStyle('textColor', this.value)">
                            </div>
                        </div>
                    </div>
                `
            })
        };
    
        // 공통 속성 섹션 생성
        const commonSections = [
            {
                title: 'Type',
                content: this.selectedElement.type
            },
            {
                title: 'Layer Position',
                content: `
                    <div class="layer-controls">
                        <button onclick="tool.moveToTop()">To Top</button>
                        <button onclick="tool.moveUp()">Up</button>
                        <button onclick="tool.moveToBottom()">To Bottom</button>
                        <button onclick="tool.moveDown()">Down</button>
                    </div>
                `
            },
            {
                title: 'Position',
                content: this.createNumberInputs({
                    x: Math.round(this.selectedElement.x),
                    y: Math.round(this.selectedElement.y)
                })
            },
            {
                title: 'Size',
                content: this.createNumberInputs({
                    width: Math.round(this.selectedElement.width),
                    height: Math.round(this.selectedElement.height)
                })
            },
            {
                title: 'Content',
                content: `
                    <textarea 
                        class="property-input auto-resize" 
                        onchange="tool.updateElementProperty('content', this.value)"
                        oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'"
                    >${this.selectedElement.content || ''}</textarea>
                `
            }
        ];
    
        // 최종 HTML 생성
        const specialControl = specialControls[this.selectedElement.type]?.(this.selectedElement);
        
        const sections = [
            ...commonSections.map(section => this.createPropertyGroup(section.title, section.content)),
            specialControl && this.createPropertyGroup(specialControl.title, specialControl.html)
        ].filter(section => section !== undefined && section !== '');
    
        const validSections = sections.filter(Boolean).join('') || ''; // 기본값으로 빈 문자열 설정
        propertiesDiv.innerHTML = validSections;
    
        // textarea 자동 높이 조절
        const textarea = propertiesDiv.querySelector('textarea.auto-resize');
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }

    createAlignButton(align, element) {
        const icons = {
            start: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18" /></svg>',
            center: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>',
            end: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" /></svg>'
        };
        
        return `
            <button 
                class="style-button ${element.textAlign === align ? 'active' : ''}"
                onclick="tool.updateTextAlign('${align}')"
                title="Align ${align}">
                ${icons[align]}
            </button>
        `;
    }

    // 테이블 구조 업데이트 메서드
    updateTableStructure(value, type) {
        if (!this.selectedElement || this.selectedElement.type !== 'table') return;
        
        const newValue = parseInt(value);
        if (isNaN(newValue) || newValue < 1) return;
        
        const element = this.selectedElement;
        
        // 기존 데이터를 복사
        const oldData = JSON.parse(JSON.stringify(element.data));
        let newData = [];
        
        if (type === 'rows') {
            element.rows = newValue;
            // 행 수 조정
            for (let i = 0; i < newValue; i++) {
                if (i < oldData.length) {
                    // 기존 행 유지
                    newData.push(oldData[i]);
                } else {
                    // 새 행 추가
                    const newRow = [];
                    for (let j = 0; j < element.cols; j++) {
                        newRow.push(`Cell ${i},${j + 1}`);
                    }
                    newData.push(newRow);
                }
            }
        } else if (type === 'cols') {
            element.cols = newValue;
            // 열 수 조정
            for (let i = 0; i < element.rows; i++) {
                const newRow = [];
                const oldRow = oldData[i] || [];
                
                for (let j = 0; j < newValue; j++) {
                    if (j < oldRow.length) {
                        // 기존 열 데이터 유지
                        newRow.push(oldRow[j]);
                    } else {
                        // 새 열 데이터 추가
                        newRow.push(i === 0 ? `Header ${j + 1}` : `Cell ${i},${j + 1}`);
                    }
                }
                newData.push(newRow);
            }
        }
        
        // 새 데이터로 업데이트
        element.data = newData;
        
        // 테이블 재렌더링
        const elementDiv = document.getElementById(`element-${element.id}`);
        if (elementDiv) {
            const oldContainer = elementDiv.querySelector('.table-container');
            if (oldContainer) {
                elementDiv.removeChild(oldContainer);
            }
            
            // 테이블 컨테이너 새로 생성
            const container = document.createElement('div');
            container.className = 'table-container';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.overflow = 'auto';
    
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.fontSize = `${element.fontSize}px`;
            table.style.color = element.textColor;
    
            element.data.forEach((rowData, i) => {
                const row = document.createElement('tr');
                rowData.forEach((cellData, j) => {
                    const cell = document.createElement(i === 0 ? 'th' : 'td');
                    cell.textContent = cellData;
                    cell.style.padding = `${element.cellPadding}px`;
                    cell.style.border = `1px solid ${element.borderColor}`;
                    cell.style.backgroundColor = i === 0 ? element.headerBgColor : element.cellBgColor;
                    cell.style.fontWeight = i === 0 ? element.headerFontWeight : element.cellFontWeight;
                    
                    // 셀 편집 이벤트 리스너 추가
                    cell.addEventListener('dblclick', (e) => {
                        if (!this.previewMode) {
                            e.stopPropagation();
                            this.startEditingTableCell(element, i, j, e.target);
                        }
                    });
                    
                    row.appendChild(cell);
                });
                table.appendChild(row);
            });
    
            container.appendChild(table);
            elementDiv.appendChild(container);
        }
        
        this.saveHistory();
        this.updateProperties();
    }
    

    // 테이블 스타일 업데이트 메서드
    updateTableStyle(property, value) {
        if (!this.selectedElement || this.selectedElement.type !== 'table') return;
        
        const element = this.selectedElement;
        
        // 숫자 값에 대한 처리
        if (['cellPadding', 'fontSize'].includes(property)) {
            element[property] = parseInt(value);
        } else {
            element[property] = value;
        }
        
        // 테이블 직접 업데이트
        const elementDiv = document.getElementById(`element-${element.id}`);
        if (elementDiv) {
            const table = elementDiv.querySelector('table');
            if (table) {
                // 테이블 전체 스타일 업데이트
                if (property === 'fontSize') {
                    table.style.fontSize = `${value}px`;
                } else if (property === 'textColor') {
                    table.style.color = value;
                }
    
                // 셀별 스타일 업데이트
                const cells = table.querySelectorAll('th, td');
                cells.forEach((cell, index) => {
                    const isHeader = cell.tagName.toLowerCase() === 'th';
                    
                    switch(property) {
                        case 'cellPadding':
                            cell.style.padding = `${value}px`;
                            break;
                        case 'borderColor':
                            cell.style.border = `1px solid ${value}`;
                            break;
                        case 'headerBgColor':
                            if (isHeader) {
                                cell.style.backgroundColor = value;
                            }
                            break;
                        case 'cellBgColor':
                            if (!isHeader) {
                                cell.style.backgroundColor = value;
                            }
                            break;
                    }
                });
            }
        }
        
        this.saveHistory();
        this.updateProperties();
    }


    // 헬퍼 메서드들
    createPropertyGroup(title, content) {
        return `
            <div class="property-group">
                <label class="property-label">${title}</label>
                <div>${content}</div>
            </div>
        `;
    }
    
    createColorControl(label, value, property) {
        const handlers = {
            box: 'updateBoxStyle',
        };
    
        // 현재 선택된 요소의 타입에 따라 적절한 핸들러 선택
        const handler = handlers[this.selectedElement.type] || 'updateElementProperty';
        
        return `
            <div class="color-control">
                <label>${label}</label>
                <input type="color" 
                    value="${value || '#ffffff'}"
                    onchange="tool.${handler}('${property}', this.value)">
            </div>
        `;
    }
    
    createNumberInputs(values) {
        return Object.entries(values)
            .map(([key, value]) => `
                <input type="number" 
                    class="property-input" 
                    value="${value}"
                    onchange="tool.updateElementProperty('${key}', this.value)">
            `).join('');
    }
    
    
    createStickyControls(element) {
        return `
            <div class="sticky-controls">
                <div class="control-group">
                    <label>Opacity</label>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="1" 
                        step="0.1" 
                        value="${element.opacity}"
                        onchange="tool.updateStickyStyle('opacity', this.value)"
                        class="opacity-slider">
                    <span>${Math.round(element.opacity * 100)}%</span>
                </div>
                <div class="control-group">
                    <label>Font Size</label>
                    <input 
                        type="number" 
                        min="8" 
                        max="72" 
                        value="${element.fontSize}"
                        onchange="tool.updateStickyStyle('fontSize', this.value)"
                        class="font-size-input">
                    <span>px</span>
                </div>
            </div>
        `;
    }

    updateTextAlign(align) {
        if (!this.selectedElement || this.selectedElement.type !== 'text') return;
        
        this.selectedElement.justifyContent = align;
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        if (elementDiv) {
            elementDiv.style.justifyContent = align;
            // 편집 중인 경우에도 적용
            const editableDiv = elementDiv.querySelector('.editable-text');
            if (editableDiv) {
                editableDiv.style.justifyContent = align;
            }
        }
        
        this.updateProperties();
        this.saveHistory();
    }

    updateStickyStyle(property, value) {
        if (!this.selectedElement || this.selectedElement.type !== 'sticky') return;
    
        this.selectedElement[property] = property === 'opacity' ? 
            parseFloat(value) : 
            parseInt(value);
    
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        const contentDiv = elementDiv.querySelector('.sticky-content');
        
        switch(property) {
            case 'opacity':
                elementDiv.style.opacity = value;
                this.updateProperties(); // 퍼센트 표시 업데이트
                break;
            case 'fontSize':
                contentDiv.style.fontSize = `${value}px`;
                break;
        }
    
        this.saveHistory();
    }

    updateBoxStyle(property, value) {
        if (!this.selectedElement || this.selectedElement.type !== 'box') return;
        
        const processedValue = property === 'radius' ? parseInt(value) : 
                              property === 'opacity' ? parseFloat(value) : 
                              value;
        this.selectedElement[property] = processedValue;
        
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        const innerContainer = elementDiv.children[0];
        
        switch (property) {
            case 'backgroundColor':
                innerContainer.style.backgroundColor = value;
                break;
                
            case 'borderColor':
                innerContainer.style.borderColor = value;
                break;
                
            case 'radius':
                innerContainer.style.borderRadius = `${processedValue}px`;
                break;
    
            case 'opacity':
                innerContainer.style.opacity = processedValue;
                break;
        }
        
        this.saveHistory();
        this.updateProperties();
    }

    updateBoxColor(color) {
        if (!this.selectedElement || this.selectedElement.type !== 'box') return;
        
        this.selectedElement.backgroundColor = color;
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        elementDiv.style.backgroundColor = color;
        
        this.saveHistory();
    }

    updateStickyColor(color) {
        if (!this.selectedElement || this.selectedElement.type !== 'sticky') return;
        
        this.selectedElement.stickyColor = color;
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        elementDiv.style.backgroundColor = color;
        
        this.updateProperties();
        this.saveHistory();
    }

    updateElementProperty(property, value) {
        if (!this.selectedElement) return;
    
        const numValue = property === 'content' ? value : Number(value);
        this.selectedElement[property] = numValue;
    
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        switch(property) {
            case 'x':
                elementDiv.style.left = `${numValue}px`;
                break;
            case 'y':
                elementDiv.style.top = `${numValue}px`;
                break;
            case 'width':
                elementDiv.style.width = `${numValue}px`;
                break;
            case 'height':
                elementDiv.style.height = `${numValue}px`;
                break;
            case 'content':
                if (this.selectedElement.type === 'input') {
                    elementDiv.querySelector('input').placeholder = value;
                } else if (this.selectedElement.type === 'panel') {
                    // 패널의 경우 content 부분만 업데이트
                    const contentDiv = elementDiv.querySelector('.panel-content');
                    if (contentDiv) {
                        contentDiv.textContent = value;
                    }
                } else {
                    elementDiv.textContent = value;
                }
                break;
        }
    
        this.saveHistory();
        this.updateLayersList();
    }

    updateFontSize(size) {
        if (!this.selectedElement || this.selectedElement.type !== 'text') return;
        
        const fontSize = Math.max(8, Math.min(72, parseInt(size))); // 8px ~ 72px 제한
        this.selectedElement.fontSize = fontSize;
        
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        elementDiv.style.fontSize = `${fontSize}px`;
        
        this.saveHistory();
    }

    increaseFontSize() {
        if (!this.selectedElement || this.selectedElement.type !== 'text') return;
        const currentSize = this.selectedElement.fontSize || 16;
        this.updateFontSize(currentSize + 2);
    }

    decreaseFontSize() {
        if (!this.selectedElement || this.selectedElement.type !== 'text') return;
        const currentSize = this.selectedElement.fontSize || 16;
        this.updateFontSize(currentSize - 2);
    }

    updateLayersList() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
    
        [...this.elements].reverse().forEach(element => {
            const layerItem = document.createElement('div');
            layerItem.className = `layer-item${element === this.selectedElement ? ' selected' : ''}`;
            
            layerItem.innerHTML = `
                <div class="layer-info">
                    <span class="layer-name">${element.name}</span>
                    <small class="layer-type">${element.type}</small>
                </div>
                <div class="layer-actions">
                    <button class="edit-name-btn" onclick="tool.editElementName(${element.id})" title="Edit Name">✏️</button>
                    <button class="delete-btn" onclick="tool.deleteElement(${element.id})" title="Delete">🗑️</button>
                </div>
            `;
    
            layerItem.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.selectElement(element);
                }
            });
            layersList.appendChild(layerItem);
        });
    }

    editElementName(elementId) {
        const element = this.elements.find(el => el.id === elementId);
        if (!element) return;
    
        const newName = prompt('Enter new name:', element.name);
        if (newName && newName.trim()) {
            element.name = newName.trim();
            this.updateLayersList();
            this.saveHistory();
        }
    }

    deleteElement(id) {
        const elementToDelete = id ? this.elements.find(e => e.id === id) : this.selectedElement;
        if (!elementToDelete) return;

        const elementDiv = document.getElementById(`element-${elementToDelete.id}`);
        if (elementDiv) elementDiv.remove();

        this.elements = this.elements.filter(e => e !== elementToDelete);
        if (this.selectedElement === elementToDelete) {
            this.selectedElement = null;
        }

        this.updateProperties();
        this.updateLayersList();
        this.saveHistory();
    }

    deleteSelected() {
        this.deleteElement();
    }

    setGridSize(size) {
        this.gridSize = parseInt(size);
        const canvas = document.getElementById('canvas');
        if (this.gridSize > 0) {
            canvas.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
        } else {
            canvas.style.backgroundSize = '0';
        }
    }

    clearSelection() {
        document.querySelectorAll('.element.selected').forEach((el) => {
            el.classList.remove('selected');
            el.querySelectorAll('.resize-handle').forEach(handle => handle.remove());  // 리사이즈 핸들 제거
        });
        this.selectedElement = null;
        this.updateProperties();
        this.updateLayersList();
    }

    // 요소를 맨 위로 이동
    moveToTop() {
        if (!this.selectedElement) return;
        
        this.maxZIndex++;
        this.selectedElement.zIndex = this.maxZIndex;
        const elementDiv = document.getElementById(`element-${this.selectedElement.id}`);
        elementDiv.style.zIndex = this.maxZIndex;
        this.saveHistory();
    }

    // 요소를 한 단계 위로 이동
    moveUp() {
        if (!this.selectedElement) return;
        
        const currentZ = this.selectedElement.zIndex || 0;
        const upperElement = this.elements.find(el => el.zIndex === currentZ + 1);
        
        if (upperElement) {
            upperElement.zIndex = currentZ;
            document.getElementById(`element-${upperElement.id}`).style.zIndex = currentZ;
            
            this.selectedElement.zIndex = currentZ + 1;
            document.getElementById(`element-${this.selectedElement.id}`).style.zIndex = currentZ + 1;
        } else {
            this.moveToTop();
        }
        
        this.saveHistory();
    }

    // 요소를 한 단계 아래로 이동
    moveDown() {
        if (!this.selectedElement) return;
        
        const currentZ = this.selectedElement.zIndex || 0;
        const lowerElement = this.elements.find(el => el.zIndex === currentZ - 1);
        
        if (lowerElement && currentZ > 1) {
            lowerElement.zIndex = currentZ;
            document.getElementById(`element-${lowerElement.id}`).style.zIndex = currentZ;
            
            this.selectedElement.zIndex = currentZ - 1;
            document.getElementById(`element-${this.selectedElement.id}`).style.zIndex = currentZ - 1;
        } else {
            this.moveToBottom();
        }
        
        this.saveHistory();
    }

    // 요소를 맨 아래로 이동
    moveToBottom() {
        if (!this.selectedElement) return;
        
        this.elements.forEach(element => {
            if (element !== this.selectedElement) {
                element.zIndex = (element.zIndex || 0) + 1;
                const elementDiv = document.getElementById(`element-${element.id}`);
                elementDiv.style.zIndex = element.zIndex;
            }
        });
        
        this.selectedElement.zIndex = 1;
        document.getElementById(`element-${this.selectedElement.id}`).style.zIndex = 1;
        
        this.maxZIndex = Math.max(...this.elements.map(el => el.zIndex || 0));
        this.saveHistory();
    }

    // 실행 취소/다시 실행 관련 메서드
    saveHistory() {
        this.history = this.history.slice(0, this.currentHistoryIndex + 1);
        this.history.push(JSON.stringify(this.elements));
        this.currentHistoryIndex++;
    }

    undo() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            this.loadState(this.history[this.currentHistoryIndex]);
        }
    }

    redo() {
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.currentHistoryIndex++;
            this.loadState(this.history[this.currentHistoryIndex]);
        }
    }

    loadState(state) {
        this.elements = JSON.parse(state);
        this.selectedElement = null;
        document.getElementById('canvas').innerHTML = '';
        this.elements.forEach(element => this.renderElement(element));
        this.updateProperties();
    }

    // 저장/불러오기 관련 메서드
    save() {
        // 현재 페이지 상태 저장
        if (this.currentPageId) {
            const currentPage = this.pages.get(this.currentPageId);
            if (currentPage) {
                currentPage.elements = this.elements;
                currentPage.device = this.currentDevice;
                currentPage.gridSize = this.gridSize;
            }
        }
        
        const data = {
            pages: Array.from(this.pages.entries()).map(([pageId, page]) => ({
                id: pageId,
                name: page.name,
                elements: page.elements,
                connections: this.connections, // 연결 정보 추가
                device: page.device,
                gridSize: page.gridSize
            })),
            currentPageId: this.currentPageId,
            maxZIndex: this.maxZIndex
        };
        
        const json = JSON.stringify(data);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prototype.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    load() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    // connections 복원
                    this.connections = data.pages[0].connections || [];
                    // ���결선 다시 그리기
                    this.connections.forEach(connection => {
                        this.renderConnection(connection);
                    });
                    
                    // 페이지 맵 재구성
                    this.pages = new Map(
                        data.pages.map(page => [
                            page.id,
                            {
                                id: page.id,
                                name: page.name,
                                elements: page.elements,
                                device: page.device,
                                gridSize: page.gridSize
                            }
                        ])
                    );
                    
                    // 현재 페이지 ID 설정
                    this.currentPageId = data.currentPageId;
                    
                    // maxZIndex 복원
                    this.maxZIndex = data.maxZIndex || Math.max(
                        ...data.pages.flatMap(page => 
                            page.elements.map(el => el.zIndex || 0)
                        ),
                        0
                    );
    
                    // 현재 페이지로 전환
                    if (this.currentPageId && this.pages.has(this.currentPageId)) {
                        const currentPage = this.pages.get(this.currentPageId);
                        this.elements = currentPage.elements || [];
                        this.currentDevice = currentPage.device;
                        this.setGridSize(currentPage.gridSize || 0);
                        
                        // UI 업데이트
                        this.renderCanvas();
                        this.updatePageList();
                    } else if (this.pages.size > 0) {
                        // 현재 페이지가 없으면 첫 번째 페이지로
                        this.currentPageId = this.pages.keys().next().value;
                        this.switchPage(this.currentPageId);
                    }
    
                } catch (error) {
                    console.error('Error loading file:', error);
                    alert('Failed to load the file. Please make sure it is a valid prototype file.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // 이미지로 내보내기
    async exportAsImage() {
        const canvas = document.getElementById('canvas');

        // 현재 상태를 저장
        const originalStyle = canvas.style.backgroundImage;
        const selectedElement = this.selectedElement;
        const resizeHandles = document.querySelectorAll('.resize-handle');
        
        try {
            // 1. 그리드 제거
            canvas.style.backgroundImage = 'none';
            
            // 2. 선택된 요소의 상태 제거
            if(selectedElement) {
                const selectedDiv = document.getElementById(`element-${selectedElement.id}`);
                if(selectedDiv) selectedDiv.classList.remove('selected');
            }
            
            // 3. 리사이즈 핸들 임시 숨김
            resizeHandles.forEach(handle => {
                handle.style.display = 'none';
            });

            // html2canvas 옵션 설정
            const options = {
                backgroundColor: '#ffffff',
                scale: 2, // 고해상도
                useCORS: true,
                logging: false,
                removeContainer: false,
                ignoreElements: (element) => {
                    // resize-handle 클래스를 가진 요소 무시
                    return element.classList.contains('resize-handle');
                }
            };

            // 이미지 생성
            const imageCanvas = await html2canvas(canvas, options);
            
            // 이미지 다운로드
            const link = document.createElement('a');
            link.download = 'prototype.png';
            link.href = imageCanvas.toDataURL('image/png', 1.0);
            link.click();

        } catch (error) {
            console.error('Failed to export image:', error);
            alert('Failed to export image. Please try again.');
        } finally {
            // 모든 상태 복원
            canvas.style.backgroundImage = originalStyle;
            
            if(selectedElement) {
                const selectedDiv = document.getElementById(`element-${selectedElement.id}`);
                if(selectedDiv) {
                    selectedDiv.classList.add('selected');
                    // 리사이즈 핸들 다시 표시
                    this.addResizeHandles(selectedDiv);
                }
            }

            // 숨겼던 리사이즈 핸들 복원
            resizeHandles.forEach(handle => {
                handle.style.display = '';
            });
        }
    }

    showShortcutGuide() {
        const modal = document.createElement('div');
        modal.className = 'shortcut-modal';
        
        modal.innerHTML = `
            <div class="shortcut-content">
                <button class="shortcut-close" onclick="this.closest('.shortcut-modal').remove()">x</button>
                <h2 style="margin-bottom: 20px;">Keyboard Shortcuts</h2>
                
                <div class="shortcut-section">
                    <h3>Navigation</h3>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <span>Pan Canvas</span>
                            <div class="shortcut-keys">
                                <span class="key">Space</span>
                                <span>+ Drag</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span>Zoom In/Out</span>
                            <div class="shortcut-keys">
                                <span class="key">Ctrl</span>
                                <span>+ Scroll</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    
        // Mac 사용자를 위한 단축키 수정
        if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
            modal.querySelectorAll('.key').forEach(key => {
                if (key.textContent === 'Ctrl') {
                    key.textContent = '⌘';
                }
            });
        }
    
        document.body.appendChild(modal);
    
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    
        // ESC 키로 닫기
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    addNewPage() {
        const pageName = prompt('Enter page name:', `Page ${this.pages.size + 1}`);
        if (pageName && pageName.trim()) {
            this.createPage(pageName.trim());
        }
    }
    
    switchPage(pageId) {
        if (!this.pages.has(pageId)) return;
        
        // 현재 페이지 상태 저장
        if (this.currentPageId) {
            const currentPage = this.pages.get(this.currentPageId);
            currentPage.elements = this.elements;
            currentPage.device = this.currentDevice;
            currentPage.gridSize = this.gridSize;
        }
        
        // 새 페이지 로드
        const newPage = this.pages.get(pageId);
        this.elements = [...newPage.elements];
        this.currentPageId = pageId;
        this.currentDevice = newPage.device;
        this.gridSize = newPage.gridSize;
        
        // UI 업데이트
        this.renderCanvas();
        this.updatePageList();
    }
    
    renamePage(pageId) {
        const page = this.pages.get(pageId);
        if (!page) return;
        
        const newName = prompt('Enter new page name:', page.name);
        if (newName && newName.trim()) {
            page.name = newName.trim();
            this.updatePageList();
        }
    }
    
    deletePage(pageId) {
        if (this.pages.size <= 1) {
            alert('Cannot delete the last page');
            return;
        }
        
        if (confirm('Are you sure you want to delete this page?')) {
            this.pages.delete(pageId);
            if (this.currentPageId === pageId) {
                this.currentPageId = this.pages.keys().next().value;
                this.switchPage(this.currentPageId);
            } else {
                this.updatePageList();
            }
        }
    }
    
    updatePageList() {
        const pagesList = document.getElementById('pages-list');
        pagesList.innerHTML = '';
        
        this.pages.forEach((page, pageId) => {
            const pageItem = document.createElement('div');
            pageItem.className = `page-item${pageId === this.currentPageId ? ' active' : ''}`;
            
            pageItem.innerHTML = `
                <span class="page-name">${page.name}</span>
                <div class="page-actions">
                    <button onclick="tool.renamePage(${pageId})" title="Rename">✏️</button>
                    <button onclick="tool.deletePage(${pageId})" title="Delete">🗑️</button>
                </div>
            `;
            
            pageItem.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.switchPage(pageId);
                }
            });
            
            pagesList.appendChild(pageItem);
        });
    }
    
    // 캔버스 렌더링 메서드
    renderCanvas() {
        const canvas = document.getElementById('canvas');
        canvas.innerHTML = '';
        this.elements.forEach(element => this.renderElement(element));
        this.selectedElement = null;
        this.updateProperties();
        this.updateLayersList();
    }
}

// 툴 초기화
const tool = new PrototypingTool();// 툴 초기화