document.addEventListener('DOMContentLoaded', async () => {
    const reservationList = document.getElementById('reservationList');
    
    // 요약 박스 엘리먼트 (인원수 표시용)
    const totalBookedEl = document.getElementById('totalBookedCount');
    const totalCanceledEl = document.getElementById('totalCanceledCount');
    
    // 필터 엘리먼트들
    const searchInput = document.getElementById('searchInput');
    const filterLocation = document.getElementById('filterLocation');
    const filterDate = document.getElementById('filterDate');
    const filterTime = document.getElementById('filterTime');
    
    const GET_URL = 'https://reservation-api.tonycho999.workers.dev/api/reservations';
    const UPDATE_URL = 'https://reservation-api.tonycho999.workers.dev/api/update-status';
    const DELETE_URL = 'https://reservation-api.tonycho999.workers.dev/api/delete-reservation'; // ⭐️ 추가됨

    let allReservations = []; 

    // 상태에 따른 배경색/글자색 스타일 반환 함수
    function getStatusStyle(status) {
        if (status === '예약완료') {
            return 'background-color: #28a745; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
        } else if (status === '예약취소') {
            return 'background-color: #6c757d; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;';
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
            
            // 뱃지 텍스트 및 색상 로직
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
                    <!-- ⭐️ 삭제 버튼 추가 -->
                    <button class="btn-delete" data-id="${item.id}">X 삭제</button>
                </td>
            `;
            reservationList.appendChild(row);
        });

        if(totalBookedEl) totalBookedEl.textContent = sumBooked;
        if(totalCanceledEl) totalCanceledEl.textContent = sumCanceled;

        attachSelectListeners();
        attachDeleteListeners(); // ⭐️ 삭제 이벤트 리스너 등록
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

    // ⭐️ 삭제 버튼 동작 로직
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
                        alert('예약이 완전히 삭제되었습니다.');
                        // 성공하면 배열에서 해당 데이터를 빼고 화면 다시 그리기
                        allReservations = allReservations.filter(item => item.id != reservationId);
                        applyFilters(); 
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

    function applyFilters() {
        const keyword = searchInput.value.toLowerCase().trim();
        const loc = filterLocation.value;
        const date = filterDate.value;
        const time = filterTime.value;

        const filteredData = allReservations.filter(item => {
            const matchKeyword = 
                (item.name && item.name.toLowerCase().includes(keyword)) || 
                (item.phone && item.phone.includes(keyword)) ||
                (item.reservation_code && item.reservation_code.toLowerCase().includes(keyword));
                
            const matchLoc = loc === "" || item.location.includes(loc);
            const matchDate = date === "" || item.date === date;
            const matchTime = time === "" || item.time_slot.includes(time);

            return matchKeyword && matchLoc && matchDate && matchTime;
        });

        // ⭐️ 정렬 로직: 필터링된 후 가장 최신 날짜순(내림차순) -> 이른 회차순(오름차순) 정렬
        filteredData.sort((a, b) => {
            if (a.date !== b.date) {
                return new Date(b.date) - new Date(a.date); // 날짜 최근 순
            }
            return a.time_slot.localeCompare(b.time_slot); // 회차 빠른 순
        });

        renderTable(filteredData);
    }

    [searchInput, filterLocation, filterDate, filterTime].forEach(el => {
        if(el) el.addEventListener('input', applyFilters);
    });

    try {
        const response = await fetch(GET_URL);
        const data = await response.json();
        allReservations = data;
        applyFilters(); // ⭐️ 초기 로드 시에도 정렬이 적용되도록 수정
    } catch (error) {
        reservationList.innerHTML = '<tr><td colspan="6">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }
});
