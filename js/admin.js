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
    const DELETE_URL = 'https://reservation-api.tonycho999.workers.dev/api/delete-reservation';

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
                    <!-- 삭제 버튼 -->
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
                        // 성공 시 전체 배열에서 명확하게 제거
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

    // ⭐️ 데이터를 정렬하는 핵심 함수
    // ⭐️ 데이터를 정렬하는 핵심 함수 (가까운 날짜순, 빠른 회차순)
    function sortReservations(dataArray) {
        return dataArray.sort((a, b) => {
            // 1순위: 날짜 기준 오름차순 (오늘과 가까운 빠른 날짜가 맨 위로!)
            if (a.date !== b.date) {
                // a.date - b.date 순서로 빼면 과거(가까운) 날짜가 먼저 나옵니다.
                return new Date(a.date) - new Date(b.date); 
            }
            
            // 2순위: 날짜가 같으면 회차 빠른 순서대로 (오름차순)
            // 회차 문자열(예: "3회차 (14:00~14:50)")에서 숫자만 추출하여 비교
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

        // ⭐️ 필터링된 데이터를 다시 한번 강력하게 정렬
        filteredData = sortReservations(filteredData);
        
        renderTable(filteredData);
    }

    [searchInput, filterLocation, filterDate, filterTime].forEach(el => {
        if(el) el.addEventListener('input', applyFilters);
    });

    // ⭐️ 초기 데이터 로드 시 완벽 정렬 보장
    try {
        const response = await fetch(GET_URL);
        const data = await response.json();
        
        // 서버에서 받아온 원본 데이터를 즉시 최신 날짜순으로 1차 정렬
        allReservations = sortReservations(data);
        
        // 정렬된 데이터를 바탕으로 필터 적용 및 화면 그리기
        applyFilters(); 
    } catch (error) {
        reservationList.innerHTML = '<tr><td colspan="6">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }
});
