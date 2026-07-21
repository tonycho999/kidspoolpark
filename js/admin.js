document.addEventListener('DOMContentLoaded', async () => {

    const reservationList = document.getElementById('reservationList');
    
    // 요약 박스 엘리먼트 (인원수 표시용)
    const totalBookedEl = document.getElementById('totalBookedCount');
    const totalCanceledEl = document.getElementById('totalCanceledCount');
    
    // 예약 필터 엘리먼트들
    const searchInput = document.getElementById('searchInput');
    const filterLocation = document.getElementById('filterLocation');
    const filterDate = document.getElementById('filterDate');
    const filterTime = document.getElementById('filterTime');

    // ⭐️ 운영 설정 (우천 휴장) 엘리먼트들
    const settingLocationSelect = document.getElementById('settingLocation');
    const settingDateInput = document.getElementById('settingDate');
    const noticeActiveCheckbox = document.getElementById('noticeActive');
    const slotCheckboxes = document.querySelectorAll('.slot-checkbox');
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    
    // ⭐️ 서버 주소
    const API_BASE = 'https://reservation-api.tonycho999.workers.dev';
    const GET_URL = `${API_BASE}/api/reservations`;
    const UPDATE_URL = `${API_BASE}/api/update-status`;
    const DELETE_URL = `${API_BASE}/api/delete-reservation`;
    const SETTINGS_URL = `${API_BASE}/api/settings`;

    let allReservations = []; 

    function getStatusStyle(status) {
        if (status === '예약완료') {
            return 'background-color: #28a745; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
        } else if (status === '예약취소') {
            return 'background-color: #dc3545; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
        } else { // 예약대기
            return 'background-color: #ffffff; color: #333; border: 1px solid #ccc; padding: 5px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
        }
    }

    function renderTable(dataToRender) {
        reservationList.innerHTML = ''; 
        
        let sumBooked = 0;
        let sumCanceled = 0;

        if (dataToRender.length === 0) {
            reservationList.innerHTML = '<tr><td colspan="6">일치하는 예약 내역이 없습니다.</td></tr>';
            if(totalBookedEl) totalBookedEl.textContent = '0';
            if(totalCanceledEl) totalCanceledEl.textContent = '0';
            return;
        }

        dataToRender.forEach(item => {
            const currentStatus = item.status || '예약대기';
            
            const peopleCount = parseInt(item.people) || 0;
            if (currentStatus === '예약취소') {
                sumCanceled += peopleCount;
            } else {
                sumBooked += peopleCount;
            }

            const row = document.createElement('tr');
            
            const isMunyhyeon = item.location.includes('장소 1');
            const locationColor = isMunyhyeon ? '#0056b3' : '#28a745'; 
            const locationText = isMunyhyeon ? '문현동' : '갈현동';     
            const locationBadge = `<span style="background:${locationColor}; color:white; padding:3px 6px; border-radius:3px; font-size:0.8em; margin-bottom:5px; display:inline-block; font-weight:bold;">${locationText}</span><br>`;
            const dateTimeStr = `${locationBadge}<strong>${item.date}</strong><br><span style="font-size:0.85em; color:#666;">${item.time_slot}</span>`;
            const userInfoStr = `<strong>${item.name}</strong> (${item.phone})<br><span style="font-size:0.85em; color:#666;">${item.email} / ${item.birthdate}</span>`;

            row.innerHTML = `
                <td>${dateTimeStr}</td>
                <td style="font-family: monospace; font-weight: bold; color: #0056b3;">${item.reservation_code || '-'}</td>
                <td style="text-align:left;">${userInfoStr}</td>
                <td style="text-align:left; font-size:0.9em; max-width:250px; word-break:keep-all;">${item.address || '-'}</td>
                <td>${item.people}명</td>
                <td style="white-space: nowrap;">
                    <select class="status-select" data-id="${item.id}" style="${getStatusStyle(currentStatus)}">
                        <option value="예약대기" style="background:#fff; color:#333;" ${currentStatus === '예약대기' ? 'selected' : ''}>예약대기</option>
                        <option value="예약완료" style="background:#fff; color:#333;" ${currentStatus === '예약완료' ? 'selected' : ''}>예약완료</option>
                        <option value="예약취소" style="background:#fff; color:#333;" ${currentStatus === '예약취소' ? 'selected' : ''}>예약취소</option>
                    </select>
                    <button class="btn-delete" data-id="${item.id}">X 삭제</button>
                </td>
            `;
            reservationList.appendChild(row);
        });

        if(totalBookedEl) totalBookedEl.textContent = sumBooked;
        if(totalCanceledEl) totalCanceledEl.textContent = sumCanceled;

        attachSelectListeners();
        attachDeleteListeners();
    }

    function attachSelectListeners() {
        document.querySelectorAll('.status-select').forEach(selectElement => {
            selectElement.addEventListener('change', async (e) => {
                const reservationId = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                try {
                    const updateRes = await fetch(UPDATE_URL, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: reservationId, status: newStatus })
                    });
                    
                    if (updateRes.ok) {
                        const itemToUpdate = allReservations.find(item => item.id == reservationId);
                        if (itemToUpdate) itemToUpdate.status = newStatus;
                        applyFilters(); 
                    } else {
                        alert('상태 변경에 실패했습니다.');
                        location.reload(); 
                    }
                } catch (error) {
                    alert('네트워크 오류가 발생했습니다.');
                    location.reload();
                }
            });
        });
    }

    function attachDeleteListeners() {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reservationId = e.target.getAttribute('data-id');
                if (!confirm("정말로 이 예약 기록을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) {
                    return;
                }
                try {
                    const deleteRes = await fetch(DELETE_URL, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: reservationId })
                    });
                    
                    if (deleteRes.ok) {
                        allReservations = allReservations.filter(item => item.id != reservationId);
                        applyFilters(); 
                        alert('예약이 완전히 삭제되었습니다.');
                    } else {
                        alert('삭제에 실패했습니다.');
                        location.reload(); 
                    }
                } catch (error) {
                    alert('네트워크 오류가 발생했습니다.');
                    location.reload();
                }
            });
        });
    }

    function sortReservations(dataArray) {
        return dataArray.sort((a, b) => {
            if (a.date !== b.date) {
                return new Date(a.date) - new Date(b.date); 
            }
            const matchA = a.time_slot.match(/\d+/);
            const matchB = b.time_slot.match(/\d+/);
            const numA = matchA ? parseInt(matchA[0], 10) : 0;
            const numB = matchB ? parseInt(matchB[0], 10) : 0;
            return numA - numB; 
        });
    }

    function applyFilters() {
        const keyword = searchInput.value.toLowerCase().trim();
        const loc = filterLocation.value;
        const date = filterDate.value;
        const time = filterTime.value;

        let filteredData = allReservations.filter(item => {
            const matchKeyword = 
                (item.name && item.name.toLowerCase().includes(keyword)) || 
                (item.phone && item.phone.includes(keyword)) ||
                (item.reservation_code && item.reservation_code.toLowerCase().includes(keyword));
                
            const matchLoc = loc === "" || item.location.includes(loc);
            const matchDate = date === "" || item.date === date;
            const matchTime = time === "" || item.time_slot.includes(time);
            return matchKeyword && matchLoc && matchDate && matchTime;
        });

        filteredData = sortReservations(filteredData);
        renderTable(filteredData);
    }

    [searchInput, filterLocation, filterDate, filterTime].forEach(el => {
        if(el) el.addEventListener('input', applyFilters);
    });

    // ==========================================
    // ⭐️ [신규 추가] 운영 설정(우천 휴장) 연동 로직
    // ==========================================
    
    async function loadSettings() {
        if (!settingDateInput || !settingLocationSelect) return;
        const dateStr = settingDateInput.value;
        const locStr = settingLocationSelect.value;
        if (!dateStr || !locStr) return;

        try {
            const res = await fetch(`${SETTINGS_URL}?date=${dateStr}&location=${encodeURIComponent(locStr)}`);
            const data = await res.json();
            
            if (res.ok && data.success) {
                noticeActiveCheckbox.checked = data.is_notice_active;
                slotCheckboxes.forEach(cb => {
                    // 유연한 문자열 매칭 (예: "1회차"가 "1회차 (10:00~11:00)"에 포함되어 있는지)
                    cb.checked = data.closed_slots.some(closed => closed.includes(cb.value));
                });
            } else {
                noticeActiveCheckbox.checked = false;
                slotCheckboxes.forEach(cb => cb.checked = false);
            }
        } catch (error) {
            console.error('설정 불러오기 실패:', error);
        }
    }

    if (settingDateInput) settingDateInput.addEventListener('change', loadSettings);
    if (settingLocationSelect) settingLocationSelect.addEventListener('change', loadSettings);

    // ⭐️ 설정 저장 버튼 클릭 시 API 전송 및 완료 메시지
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', async () => {
            const dateStr = settingDateInput.value;
            const locStr = settingLocationSelect.value;
            if (!dateStr) return alert('설정할 날짜를 먼저 선택해주세요!');
            if (!locStr) return alert('설정할 장소를 선택해주세요!');

            const isNoticeActive = noticeActiveCheckbox.checked;
            const closedSlots = Array.from(slotCheckboxes)
                                    .filter(cb => cb.checked)
                                    .map(cb => cb.value);

            btnSaveSettings.textContent = '저장 중...';
            btnSaveSettings.disabled = true;

            try {
                const res = await fetch(SETTINGS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        target_date: dateStr,
                        location: locStr,
                        is_notice_active: isNoticeActive,
                        closed_slots: closedSlots
                    })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    // ⭐️ 저장 성공 시 명확한 팝업 메시지 노출
                    alert(`✅ [${locStr}] 장소의 ${dateStr} 운영 설정이 성공적으로 저장되었습니다!`);
                } else {
                    alert('❌ 설정 저장에 실패했습니다.');
                }
            } catch (error) {
                alert('네트워크 오류가 발생했습니다.');
            } finally {
                btnSaveSettings.textContent = '설정 저장';
                btnSaveSettings.disabled = false;
            }
        });
    }

    try {
        const response = await fetch(GET_URL);
        const data = await response.json();
        
        allReservations = sortReservations(data);
        applyFilters(); 
    } catch (error) {
        reservationList.innerHTML = '<tr><td colspan="6">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }

    if (settingDateInput) {
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const dateLocal = (new Date(today - offset)).toISOString().split('T')[0];
        settingDateInput.value = dateLocal;
        loadSettings(); 
    }
});
