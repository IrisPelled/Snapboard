// Global variables
let currentBoard = null;
let responses = [];
let currentUser = null;
let isTeacher = false;
let boardRef = null;
let responsesListener = null;

// Hebrew stop words for word cloud
const hebrewStopWords = [
    // מילות קישור בסיסיות
    'של', 'את', 'על', 'אל', 'עם', 'כל', 'זה', 'זאת', 'היא', 'הוא', 'אני', 'אתה', 'אתן', 'אתם',
    'הם', 'הן', 'לא', 'כן', 'גם', 'רק', 'אך', 'או', 'כי', 'אם', 'כך', 'אז', 'שם', 'פה', 'כאן',
    'יש', 'אין', 'היה', 'הייתה', 'יהיה', 'תהיה', 'עוד', 'כבר', 'מאוד', 'טוב', 'רע', 'גדול', 'קטן',
    'חדש', 'ישן', 'אחר', 'אחרת', 'ראשון', 'אחרון', 'פעם', 'פעמים', 'שעה', 'יום', 'שבוע', 'חודש', 
    'שנה', 'בית', 'עיר', 'ארץ', 'עולם', 'תמיד', 'לעולם', 'אולי', 'בוודאי', 'כמובן',
    // מילות קישור נוספות
    'בין', 'תוך', 'אצל', 'מן', 'בעד', 'נגד', 'לפי', 'אחרי', 'לפני', 'במשך', 'בזמן', 'במקום',
    'להיות', 'לעשות', 'לתת', 'לקחת', 'לבוא', 'ללכת', 'לראות', 'לשמוע', 'לדבר', 'לכתוב', 'לקרוא',
    // מילים נפוצות נוספות
    'זמן', 'דבר', 'דברים', 'אנשים', 'איש', 'אשה', 'ילד', 'ילדה', 'משהו', 'מישהו', 'איפה', 'מתי',
    'איך', 'למה', 'מדוע', 'כמה', 'הרבה', 'מעט', 'קצת', 'פחות', 'יותר', 'הכי', 'ביותר'
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Wait for Firebase to be ready
    if (typeof db !== 'undefined') {
        initializeApp();
    } else {
        setTimeout(() => {
            if (typeof db !== 'undefined') {
                initializeApp();
            } else {
                console.error('Firebase not initialized properly');
                alert('שגיאה בהתחברות למסד הנתונים. נסה לרענן את הדף.');
            }
        }, 1000);
    }
});

function initializeApp() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    
    console.log('Initializing app for page:', page);
    
    switch(page) {
        case 'board.html':
            console.log('Loading board page');
            initializeBoard();
            break;
        case 'teacher.html':
            console.log('Redirecting from teacher.html to index.html');
            // Redirect to home since we removed teacher.html functionality
            window.location.href = 'index.html';
            break;
        case 'index.html':
        default:
            console.log('Loading home page');
            initializeHome();
            break;
    }
}

// Home page functions (now for teachers only)
function initializeHome() {
    // Add student join button functionality
    const studentCard = document.querySelector('.card.student-card');
    if (studentCard) {
        studentCard.onclick = showStudentJoin;
    }
    
    // Check if there's a prefill parameter for recreating a board
    const urlParams = new URLSearchParams(window.location.search);
    const prefillCode = urlParams.get('prefill');
    if (prefillCode) {
        console.log('Prefilling form with code:', prefillCode);
        
        // Focus on teacher name field
        document.getElementById('teacherName').focus();
        
        // Show a helpful message
        setTimeout(() => {
            alert(`יצירת לוח מחדש עם קוד: ${prefillCode}\n\nמלא את הפרטים ולחץ "צור לוח חדש" כדי לשתף עם המשתמשים`);
        }, 500);
    }
}

function showStudentJoin() {
    document.getElementById('student-join').style.display = 'block';
    document.getElementById('accessCode').focus();
}

function hideStudentJoin() {
    document.getElementById('student-join').style.display = 'none';
    document.getElementById('student-join').querySelector('form').reset();
}

async function joinBoard(event) {
    event.preventDefault();
    
    const accessCode = document.getElementById('accessCode').value.trim().toUpperCase();
    const studentName = document.getElementById('studentName').value.trim();
    const studentEmail = document.getElementById('studentEmail').value.trim();
    
    if (!accessCode || !studentName) {
        alert('יש למלא קוד גישה ושם');
        return;
    }
    
    try {
        // Check if board exists
        const boardSnapshot = await db.collection('boards').where('code', '==', accessCode).get();
        
        if (boardSnapshot.empty) {
            alert('קוד גישה לא נמצא. בדוק את הקוד ונסה שוב.');
            return;
        }
        
        const boardDoc = boardSnapshot.docs[0];
        const boardData = boardDoc.data();
        
        // Set current user
        currentUser = {
            name: studentName,
            email: studentEmail,
            isTeacher: false
        };
        
        // Store user in session
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('currentBoardCode', accessCode);
        
        // Redirect to board
        window.location.href = `board.html?code=${accessCode}`;
        
    } catch (error) {
        console.error('Error joining board:', error);
        alert('שגיאה בהצטרפות ללוח. נסה שוב.');
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('Original file size:', file.size, 'bytes');
        
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('קובץ התמונה גדול מדי. אנא בחר תמונה קטנה יותר (עד 5MB)');
            event.target.value = ''; // Clear the input
            return;
        }
        
        compressImage(file, (compressedDataUrl) => {
            showImagePreview(compressedDataUrl);
        });
    }
}

function compressImage(file, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Calculate new dimensions (max 800px width or height)
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
        } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
        
        console.log('Compressed image size:', compressedDataUrl.length, 'characters');
        
        // Check if still too large
        if (compressedDataUrl.length > 1000000) { // ~1MB in base64
            // Compress more
            const veryCompressed = canvas.toDataURL('image/jpeg', 0.5); // 50% quality
            callback(veryCompressed);
        } else {
            callback(compressedDataUrl);
        }
    };
    
    img.onerror = function() {
        alert('שגיאה בטעינת התמונה');
    };
    
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleImageUrl(event) {
    const url = event.target.value.trim();
    if (url) {
        showImagePreview(url);
    }
}

function showImagePreview(src) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `<img src="${src}" alt="תמונת השאלה">`;
}

async function createBoard(event) {
    event.preventDefault();
    
    console.log('Creating board...');
    
    const teacherName = document.getElementById('teacherName').value.trim();
    const question = document.getElementById('question').value.trim();
    const imageFile = document.getElementById('imageFile').files[0];
    const allowAnonymous = document.getElementById('allowAnonymous').checked;
    
    console.log('Form data:', { teacherName, question, imageFile, allowAnonymous });
    
    // Validate required fields
    if (!teacherName) {
        alert('יש להזין שם מנחה');
        return;
    }
    
    if (!question) {
        alert('יש להזין שאלה');
        return;
    }
    
    // Generate board code
    const boardCode = generateBoardCode();
    console.log('Generated board code:', boardCode);
    
    // Create board data
    const boardData = {
        code: boardCode,
        teacherName: teacherName,
        question: question,
        image: null,
        settings: {
            allowAnonymous: allowAnonymous
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Handle image
    const previewImg = document.querySelector('#imagePreview img');
    if (previewImg && previewImg.src) {
        console.log('Using compressed image from preview');
        boardData.image = previewImg.src;
    }
    
    try {
        // Save to Firebase
        await db.collection('boards').doc(boardCode).set(boardData);
        
        // Set current user as teacher
        currentUser = {
            name: teacherName,
            email: '',
            isTeacher: true
        };
        
        // Store in session
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('currentBoardCode', boardCode);
        
        console.log('Board saved successfully');
        showBoardCreated(boardData);
        
    } catch (error) {
        console.error('Error creating board:', error);
        alert('שגיאה ביצירת הלוח. נסה שוב.');
    }
}

function generateBoardCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showBoardCreated(boardData) {
    // Hide form
    document.querySelector('.main-content > .form-container').style.display = 'none';
    
    // Show success message
    const successDiv = document.getElementById('board-created');
    successDiv.style.display = 'block';
    
    // Fill in the details
    document.getElementById('displayCode').textContent = boardData.code;
    
    // Create the correct link for GitHub Pages or local
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? window.location.origin 
        : `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)}`;
    const boardLink = `${baseUrl}board.html?code=${boardData.code}`;
    document.getElementById('displayLink').textContent = boardLink;
    
    console.log('Board created successfully:', boardData);
}

function copyCode() {
    const codeElement = document.getElementById('displayCode');
    const code = codeElement.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        showToast('קוד הועתק בהצלחה! 📋');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('קוד הועתק בהצלחה! 📋');
    });
}

function copyLink() {
    const linkElement = document.getElementById('displayLink');
    const link = linkElement.textContent;
    
    navigator.clipboard.writeText(link).then(() => {
        showToast('קישור הועתק בהצלחה! 🔗');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('קישור הועתק בהצלחה! 🔗');
    });
}

function goToBoard() {
    const code = document.getElementById('displayCode').textContent;
    window.location.href = `board.html?code=${code}`;
}

function createAnother() {
    // Reset form
    document.querySelector('#boardForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    
    // Hide success message
    document.getElementById('board-created').style.display = 'none';
    
    // Show form again
    document.querySelector('.main-content > .form-container').style.display = 'block';
}

// Board page functions
async function initializeBoard() {
    const urlParams = new URLSearchParams(window.location.search);
    const boardCode = urlParams.get('code');
    
    console.log('Initializing board...');
    console.log('Board code:', boardCode);
    
    if (!boardCode) {
        alert('לא נמצא קוד לוח בקישור');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Load board from Firebase
        const boardDoc = await db.collection('boards').doc(boardCode).get();
        
        if (!boardDoc.exists) {
            alert('לוח לא נמצא. ייתכן שהקוד שגוי או שהלוח נמחק.');
            window.location.href = 'index.html';
            return;
        }
        
        const boardData = boardDoc.data();
        currentBoard = { id: boardDoc.id, ...boardData };
        
        console.log('Loaded board from Firebase:', currentBoard);
        
        // Store board reference for real-time updates
        boardRef = db.collection('boards').doc(boardCode);
        
        // Update UI with board info
        document.getElementById('boardCode').textContent = currentBoard.code;
        document.getElementById('teacherName').textContent = currentBoard.teacherName;
        document.getElementById('boardQuestion').textContent = currentBoard.question;
        
        if (currentBoard.image) {
            const imageElement = document.getElementById('questionImage');
            imageElement.innerHTML = `<img src="${currentBoard.image}" alt="תמונת השאלה">`;
            imageElement.style.display = 'block';
        }
        
        // Get current user from session
        const userJson = sessionStorage.getItem('currentUser');
        const savedBoardCode = sessionStorage.getItem('currentBoardCode');
        
        if (userJson && savedBoardCode === boardCode) {
            currentUser = JSON.parse(userJson);
            isTeacher = currentUser.isTeacher;
            
            if (isTeacher) {
                document.getElementById('teacherPanel').style.display = 'block';
                // Show debug button for teachers
                const debugBtn = document.getElementById('debugBtn');
                if (debugBtn) debugBtn.style.display = 'inline-block';
            }
        } else if (!currentUser) {
            // Check if this is a direct access without user info
            const teacherData = sessionStorage.getItem('currentUser');
            if (teacherData) {
                currentUser = JSON.parse(teacherData);
                if (currentUser.isTeacher) {
                    isTeacher = true;
                    document.getElementById('teacherPanel').style.display = 'block';
                    // Show debug button for teachers
                    const debugBtn = document.getElementById('debugBtn');
                    if (debugBtn) debugBtn.style.display = 'inline-block';
                }
            }
        }
        
        // Update join form based on board settings
        updateJoinFormForAnonymous();
        
        // Load responses with real-time listener
        setupResponsesListener();
        
    } catch (error) {
        console.error('Error loading board:', error);
        alert('שגיאה בטעינת הלוח. נסה לרענן את הדף.');
    }
}

function setupResponsesListener() {
    if (!boardRef) return;
    
    // Clean up existing listener
    if (responsesListener) {
        responsesListener();
    }
    
    // Set up real-time listener for responses
    responsesListener = db.collection('responses')
        .where('boardId', '==', currentBoard.id)
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            console.log('Responses updated, count:', snapshot.size);
            
            responses = [];
            snapshot.forEach((doc) => {
                responses.push({ id: doc.id, ...doc.data() });
            });
            
            // Reverse to show newest first
            responses.reverse();
            
            displayResponses();
            updateStats();
            updateWordCloud();
        }, (error) => {
            console.error('Error listening to responses:', error);
            // If index is not ready, try without ordering
            if (error.code === 'failed-precondition') {
                console.log('Index not ready, falling back to simple query...');
                responsesListener = db.collection('responses')
                    .where('boardId', '==', currentBoard.id)
                    .onSnapshot((snapshot) => {
                        responses = [];
                        snapshot.forEach((doc) => {
                            responses.push({ id: doc.id, ...doc.data() });
                        });
                        displayResponses();
                        updateStats();
                        updateWordCloud();
                    });
            }
        });
}

function updateJoinFormForAnonymous() {
    if (!currentBoard || !currentBoard.settings) return;
    
    const allowAnonymous = currentBoard.settings.allowAnonymous;
    const nameInput = document.getElementById('modalStudentName');
    const nameLabel = document.querySelector('label[for="modalStudentName"]');
    
    if (allowAnonymous && nameInput && nameLabel) {
        // Make name field optional
        nameInput.required = false;
        nameInput.placeholder = 'הזן את שמך (אופציונלי)';
        nameLabel.textContent = 'השם שלך (אופציונלי):';
        
        // Add explanation text if not already exists
        let explanationDiv = document.getElementById('anonymousExplanation');
        if (!explanationDiv) {
            explanationDiv = document.createElement('div');
            explanationDiv.id = 'anonymousExplanation';
            explanationDiv.className = 'anonymous-explanation';
            explanationDiv.innerHTML = '<small style="color: #666;">ניתן להשאיר ריק לתגובה אנונימית</small>';
            nameInput.parentNode.appendChild(explanationDiv);
        }
    } else if (nameInput && nameLabel) {
        // Make name field required
        nameInput.required = true;
        nameInput.placeholder = 'הזן את שמך';
        nameLabel.textContent = 'השם שלך:';
        
        // Remove explanation if exists
        const explanationDiv = document.getElementById('anonymousExplanation');
        if (explanationDiv) {
            explanationDiv.remove();
        }
    }
}

function showStudentJoin() {
    document.getElementById('studentJoinModal').style.display = 'flex';
    document.getElementById('modalStudentName').focus();
}

function hideStudentJoin() {
    document.getElementById('studentJoinModal').style.display = 'none';
}

async function joinAsStudent(event) {
    event.preventDefault();
    
    const studentName = document.getElementById('modalStudentName').value.trim();
    const studentEmail = document.getElementById('modalStudentEmail').value.trim();
    
    // Check if name is required based on board settings
    const allowAnonymous = currentBoard.settings && currentBoard.settings.allowAnonymous;
    
    if (!studentName && !allowAnonymous) {
        alert('יש להזין שם');
        return;
    }
    
    // Set current user
    currentUser = {
        name: studentName || '', // Allow empty name if anonymous is allowed
        email: studentEmail || '',
        isTeacher: false
    };
    
    // Store in session
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    sessionStorage.setItem('currentBoardCode', currentBoard.code);
    
    // Hide modal
    hideStudentJoin();
    
    // Show welcome message
    const userName = currentUser.name || 'משתמש אנונימי';
    showToast(`שלום ${userName}! ברוכים הבאים ללוח`);
}

// loadResponses function removed - now using real-time listener

function displayResponses() {
    const container = document.getElementById('responsesContainer');
    
    if (responses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>עדיין אין תשובות</h3>
                <p>המשתמשים יוכלו להוסיף תשובות עם הקוד או הקישור</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    responses.forEach(response => {
        const card = createResponseCard(response);
        container.appendChild(card);
    });
}

function createResponseCard(response) {
    const card = document.createElement('div');
    card.className = 'response-card';
    card.style.backgroundColor = response.color || '#ffb3d9';
    
    // Handle timestamp - could be Firestore Timestamp or ISO string
    let timeString = '';
    if (response.timestamp) {
        let date;
        if (response.timestamp.toDate) {
            // Firestore Timestamp
            date = response.timestamp.toDate();
        } else {
            // ISO string or other format
            date = new Date(response.timestamp);
        }
        timeString = date.toLocaleString('he-IL');
    }
    
    card.innerHTML = `
        <div class="response-header">
            <div class="response-author">${response.author || 'אנונימי'}</div>
            <div class="response-emoji">${response.emoji || '😊'}</div>
        </div>
        <div class="response-text">${response.text}</div>
        <div class="response-time">${timeString}</div>
    `;
    
    return card;
}

function showResponseForm() {
    if (!currentUser) {
        // Check if anonymous responses are allowed
        const allowAnonymous = currentBoard && currentBoard.settings && currentBoard.settings.allowAnonymous;
        if (allowAnonymous) {
            // Auto-join as anonymous user
            currentUser = {
                name: '',
                email: '',
                isTeacher: false
            };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            sessionStorage.setItem('currentBoardCode', currentBoard.code);
        } else {
            alert('יש להזדהות כדי להוסיף תגובה');
            return;
        }
    }
    
    document.getElementById('responseModal').style.display = 'flex';
}

function hideResponseForm() {
    document.getElementById('responseModal').style.display = 'none';
    const form = document.querySelector('#responseModal form');
    if (form) {
        form.reset();
    }
}

async function addResponse(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('שגיאה: לא ניתן להוסיף תשובה');
        return;
    }
    
    const text = document.getElementById('responseText').value.trim();
    const color = document.querySelector('input[name="responseColor"]:checked').value;
    const emoji = document.querySelector('input[name="responseEmoji"]:checked').value;
    
    if (!text) {
        alert('יש להזין תשובה');
        return;
    }
    
    const response = {
        boardId: currentBoard.id,
        author: currentUser.name || 'אנונימי', // Use 'אנונימי' if no name provided
        email: currentUser.email || '',
        text: text,
        color: color,
        emoji: emoji,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        // Save to Firebase
        await db.collection('responses').add(response);
        
        // Hide form
        hideResponseForm();
        
        showToast('התשובה נוספה בהצלחה!');
        
        // Update board's lastActivity
        await boardRef.update({
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('Error adding response:', error);
        alert('שגיאה בהוספת התשובה. נסה שוב.');
    }
}

// copyUpdatedLink function removed - no longer needed with Firebase

function updateStats() {
    const totalResponses = responses.length;
    const uniqueStudents = new Set(responses.map(r => r.email || r.author)).size;
    
    const totalResponsesEl = document.getElementById('totalResponses');
    const uniqueStudentsEl = document.getElementById('uniqueStudents');
    
    if (totalResponsesEl) totalResponsesEl.textContent = totalResponses;
    if (uniqueStudentsEl) uniqueStudentsEl.textContent = uniqueStudents;
}

function exportToCSV() {
    if (!isTeacher) {
        alert('רק המנחה יכול לייצא נתונים');
        return;
    }
    
    if (responses.length === 0) {
        alert('אין תשובות לייצוא');
        return;
    }
    
    const headers = ['שם', 'מייל', 'תשובה', 'זמן יצירה'];
    const csvContent = [
        headers.join(','),
        ...responses.map(r => {
            let timeString = '';
            if (r.timestamp) {
                if (r.timestamp.toDate) {
                    timeString = r.timestamp.toDate().toLocaleString('he-IL');
                } else {
                    timeString = new Date(r.timestamp).toLocaleString('he-IL');
                }
            }
            
            return [
                `"${r.author || 'אנונימי'}"`,
                `"${r.email || ''}"`,
                `"${r.text.replace(/"/g, '""')}"`,
                `"${timeString}"`
            ].join(',');
        })
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `responses_${currentBoard.code}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('הקובץ הורד בהצלחה!');
}

async function clearBoard() {
    if (!isTeacher) {
        alert('רק המנחה יכול לנקות את הלוח');
        return;
    }
    
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל התשובות? פעולה זו לא ניתנת לביטול.')) {
        return;
    }
    
    try {
        // Delete all responses for this board
        const responsesSnapshot = await db.collection('responses')
            .where('boardId', '==', currentBoard.id)
            .get();
        
        const batch = db.batch();
        responsesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        showToast('הלוח נוקה בהצלחה!');
        
    } catch (error) {
        console.error('Error clearing board:', error);
        alert('שגיאה בניקוי הלוח. נסה שוב.');
    }
}

function switchView(view) {
    const responsesView = document.getElementById('responsesView');
    const wordCloudView = document.getElementById('wordCloudView');
    const responsesBtn = document.querySelector('[data-view="responses"]');
    const wordcloudBtn = document.querySelector('[data-view="wordcloud"]');
    
    if (view === 'responses') {
        responsesView.style.display = 'block';
        wordCloudView.style.display = 'none';
        responsesBtn.classList.add('active');
        wordcloudBtn.classList.remove('active');
    } else if (view === 'wordcloud') {
        responsesView.style.display = 'none';
        wordCloudView.style.display = 'block';
        responsesBtn.classList.remove('active');
        wordcloudBtn.classList.add('active');
        updateWordCloud();
    }
}

function updateWordCloud() {
    console.log('🌩️ Updating word cloud...');
    console.log(`📊 Current responses count: ${responses.length}`);
    
    const wordCloudContainer = document.getElementById('wordCloudContainer');
    
    if (!wordCloudContainer) {
        console.log('❌ Word cloud container not found');
        return;
    }
    
    if (responses.length < 2) {
        wordCloudContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cloud"></i>
                <h3>אין מספיק תשובות לענן מילים</h3>
                <p>דרושות לפחות 2 תשובות ליצירת ענן מילים</p>
                <small>כרגע יש ${responses.length} תשובות</small>
            </div>
        `;
        return;
    }
    
    // Extract words from all responses
    const allText = responses.map(r => r.text).join(' ');
    console.log('📝 All text for word cloud:', allText);
    
    if (!allText.trim()) {
        console.log('❌ No text content found in responses');
        wordCloudContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>אין תוכן טקסטואלי</h3>
                <p>התשובות לא מכילות טקסט מתאים לענן מילים</p>
            </div>
        `;
        return;
    }
    
    const words = extractWords(allText);
    console.log(`🔤 Extracted ${words.length} words:`, words.slice(0, 10), '...');
    
    if (words.length === 0) {
        console.log('❌ No words extracted after filtering');
        wordCloudContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>לא נמצאו מילים מתאימות</h3>
                <p>לאחר סינון, לא נותרו מילים לענן המילים</p>
            </div>
        `;
        return;
    }
    
    const wordCounts = countWords(words);
    console.log(`📊 Generated ${wordCounts.length} word counts`);
    
    if (wordCounts.length === 0) {
        console.log('❌ No word counts generated');
        wordCloudContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>שגיאה בספירת מילים</h3>
                <p>לא ניתן ליצור ענן מילים מהתוכן הקיים</p>
            </div>
        `;
        return;
    }
    
    // Generate word cloud HTML
    console.log('✅ Generating word cloud HTML...');
    generateWordCloudHTML(wordCounts);
    console.log('🌩️ Word cloud updated successfully!');
}

function extractWords(text) {
    console.log('🔤 Extracting words from:', text);
    
    if (!text || text.trim() === '') {
        console.log('❌ Empty text provided');
        return [];
    }
    
    // Step 1: Clean and split text more gently
    const cleanedText = text
        // Replace punctuation and special characters with spaces, but keep Hebrew and English
        .replace(/[^\u0590-\u05FF\u0041-\u005A\u0061-\u007A\u0030-\u0039\s]/g, ' ')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        .trim();
    
    console.log('🧹 Cleaned text:', cleanedText);
    
    if (!cleanedText) {
        console.log('❌ No text after cleaning');
        return [];
    }
    
    // Step 2: Split into words
    const rawWords = cleanedText.split(' ').filter(word => word.length > 0);
    console.log('📝 Raw words after split:', rawWords);
    
    // Step 3: Filter and normalize with more lenient rules
    const processedWords = rawWords
        .map(word => word.trim()) // Clean whitespace
        .filter(word => word.length >= 2) // Keep words with 2+ characters only
        .map(word => {
            // Keep original case for Hebrew, lowercase for English
            if (/[\u0590-\u05FF]/.test(word)) {
                return word; // Keep Hebrew as-is
            } else {
                return word.toLowerCase(); // Lowercase English
            }
        })
        .filter(word => {
            // Remove pure numbers but keep words with numbers
            if (/^\d+$/.test(word)) {
                console.log('🚫 Filtering out pure number:', word);
                return false;
            }
            return true;
        })
        .filter(word => {
            // Check stop words - exact match only
            const isStopWord = hebrewStopWords.includes(word);
            if (isStopWord) {
                console.log('🛑 Filtering out stop word:', word);
                return false;
            }
            return true;
        });
    
    console.log('✅ Final processed words:', processedWords);
    console.log(`📊 Words processed: ${rawWords.length} → ${processedWords.length}`);
    
    return processedWords;
}

function countWords(words) {
    console.log('🔢 Counting words:', words);
    
    if (!words || words.length === 0) {
        console.log('❌ No words to count');
        return [];
    }
    
    const counts = {};
    
    // Count word frequencies with better normalization
    words.forEach(word => {
        // Normalize for counting (but preserve original for display)
        const normalizedWord = word.trim();
        
        if (normalizedWord.length >= 2) {
            // Use normalized form as key for counting
            const countKey = normalizedWord.toLowerCase();
            counts[countKey] = (counts[countKey] || 0) + 1;
            console.log(`📈 Counted "${normalizedWord}" (key: "${countKey}") → ${counts[countKey]}`);
        } else {
            console.log(`🚫 Skipping short word: "${normalizedWord}"`);
        }
    });
    
    console.log('📊 Word counts before sorting:', counts);
    
    // Convert to sorted array
    const sortedWords = Object.entries(counts)
        .filter(([word, count]) => count >= 1) // Only words that appear at least once
        .sort((a, b) => {
            // First sort by count (descending)
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }
            // If counts are equal, sort alphabetically with Hebrew support
            return a[0].localeCompare(b[0], 'he');
        })
        .slice(0, 80); // Increased to 80 words
    
    console.log('🏆 Final sorted words for cloud:', sortedWords);
    console.log(`📈 Total unique words: ${Object.keys(counts).length}, Showing: ${sortedWords.length}`);
    
    return sortedWords;
}

function generateWordCloudHTML(wordCounts) {
    const container = document.getElementById('wordCloudContainer');
    
    if (wordCounts.length === 0) {
        container.innerHTML = '<p style="color: #6c757d;">לא נמצאו מילים מתאימות לענן מילים</p>';
        return;
    }
    
    const maxCount = wordCounts[0][1];
    const minCount = wordCounts[wordCounts.length - 1][1];
    
    console.log(`Word cloud stats: Max count: ${maxCount}, Min count: ${minCount}, Total words: ${wordCounts.length}`);
    
    // Create more diverse colors for a vibrant cloud - matching the new pastel palette
    const colors = [
        '#d5a400', '#ffb3d9', '#c8a8e9', '#ffe66d', '#95e1d3', '#ffd4a3', '#a8c8ec',
        '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', 
        '#ff9f43', '#10ac84', '#ee5a24', '#0abde3', '#74b9ff',
        '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#fd63ff'
    ];
    
    // Track placed words to avoid overlaps
    const placedWords = [];
    
    // Function to check if two words overlap
    function checkOverlap(word1, word2, margin = 15) {
        const dx = Math.abs(word1.x - word2.x);
        const dy = Math.abs(word1.y - word2.y);
        
        // Better word dimension calculation
        const w1Width = word1.rotation === 90 || word1.rotation === -90 ? 
                        word1.size * 1.2 : word1.size * word1.text.length * 0.7;
        const w1Height = word1.rotation === 90 || word1.rotation === -90 ? 
                         word1.size * word1.text.length * 0.7 : word1.size * 1.2;
        
        const w2Width = word2.rotation === 90 || word2.rotation === -90 ? 
                        word2.size * 1.2 : word2.size * word2.text.length * 0.7;
        const w2Height = word2.rotation === 90 || word2.rotation === -90 ? 
                         word2.size * word2.text.length * 0.7 : word2.size * 1.2;
        
        // Check if words are too close (with margin)
        return dx < (w1Width + w2Width) / 2 + margin && 
               dy < (w1Height + w2Height) / 2 + margin;
    }
    
    // Function to find non-overlapping position around center
    function findNonOverlappingPosition(word, wordIndex, attempts = 100) {
        // Start close to center and spiral outward
        const baseRadius = 60; // Start closer to center
        const radiusIncrement = 12; // Smaller increments for tighter spiral
        
        for (let attempt = 0; attempt < attempts; attempt++) {
            // Calculate spiral position
            const angle = attempt * 25 + (wordIndex * 15); // More controlled angle distribution
            const radius = baseRadius + (attempt * radiusIncrement);
            
            const radian = (angle * Math.PI) / 180;
            const x = 50 + (Math.cos(radian) * radius / 5); // Divide by 5 for percentage conversion
            const y = 50 + (Math.sin(radian) * radius / 5);
            
            // Keep within reasonable bounds
            if (x < 15 || x > 85 || y < 15 || y > 85) {
                continue; // Try next position
            }
            
            // Check for overlaps with existing words
            const testWord = { ...word, x, y };
            let hasOverlap = false;
            
            for (const placed of placedWords) {
                if (checkOverlap(testWord, placed)) {
                    hasOverlap = true;
                    break;
                }
            }
            
            if (!hasOverlap) {
                return { x, y };
            }
        }
        
        // Fallback: find position farther out if needed
        for (let fallback = 0; fallback < 50; fallback++) {
            const angle = Math.random() * 360;
            const radius = 80 + (fallback * 8);
            
            const radian = (angle * Math.PI) / 180;
            const x = 50 + (Math.cos(radian) * radius / 6);
            const y = 50 + (Math.sin(radian) * radius / 6);
            
            if (x >= 10 && x <= 90 && y >= 10 && y <= 90) {
                const testWord = { ...word, x, y };
                let hasOverlap = false;
                
                for (const placed of placedWords) {
                    if (checkOverlap(testWord, placed)) {
                        hasOverlap = true;
                        break;
                    }
                }
                
                if (!hasOverlap) {
                    return { x, y };
                }
            }
        }
        
        // Last resort: random position
        return { 
            x: 25 + Math.random() * 50, 
            y: 25 + Math.random() * 50 
        };
    }
    
    // Create positioned word cloud elements
    const cloudHTML = wordCounts.map(([word, count], index) => {
        // Calculate size with more dramatic differences
        let size;
        if (maxCount === minCount) {
            size = 32;
        } else {
            const sizeRatio = (count - minCount) / (maxCount - minCount);
            // Size range: 22px to 75px for better spacing
            size = Math.round(22 + Math.pow(sizeRatio, 0.6) * 53);
        }
        
        // Pick color
        const color = colors[index % colors.length];
        
        // ONLY clear rotations: horizontal (0°) or vertical (90°, -90°)
        let rotation = 0;
        if (index > 0) {
            // Simple rotation pattern: mostly horizontal, some vertical
            const rotationOptions = [0, 0, 0, 90, 0, 0, -90, 0, 0, 90];
            rotation = rotationOptions[index % rotationOptions.length];
        }
        
        // Calculate position
        let leftPos, topPos;
        
        if (index === 0) {
            // First word always in center with protection zone
            leftPos = 50;
            topPos = 50;
            
            // Add center word with larger protection zone
            placedWords.push({
                text: word,
                x: leftPos,
                y: topPos,
                size: size * 1.3, // Larger protection zone for center word
                rotation: rotation,
                isCenter: true
            });
        } else {
            // Find position that doesn't overlap
            const wordData = { text: word, size, rotation };
            const position = findNonOverlappingPosition(wordData, index);
            leftPos = position.x;
            topPos = position.y;
            
            // Add to placed words for overlap checking
            placedWords.push({
                text: word,
                x: leftPos,
                y: topPos,
                size: size,
                rotation: rotation,
                isCenter: false
            });
        }
        
        console.log(`✅ Word: ${word}, Size: ${size}px, Position: (${leftPos.toFixed(1)}%, ${topPos.toFixed(1)}%), Rotation: ${rotation}deg`);
        
        // Debug: show current words count
        if (index % 5 === 0) {
            console.log(`📊 Placed ${placedWords.length} words so far`);
        }
        
        return `<span class="word-cloud-word" style="
            position: absolute;
            left: ${leftPos}%;
            top: ${topPos}%;
            font-size: ${size}px;
            color: ${color};
            font-weight: ${size > 50 ? 'bold' : size > 35 ? '600' : size > 25 ? '500' : 'normal'};
            text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
            transform: translate(-50%, -50%) rotate(${rotation}deg);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            white-space: nowrap;
            user-select: none;
            z-index: ${index === 0 ? 10 : 1};
        " 
        title="המילה '${word}' הוזכרה ${count} פעמים" 
        onmouseover="this.style.transform='translate(-50%, -50%) rotate(0deg) scale(1.15)'; this.style.textShadow='2px 2px 8px rgba(0,0,0,0.5)'; this.style.zIndex='100';" 
        onmouseout="this.style.transform='translate(-50%, -50%) rotate(${rotation}deg) scale(1)'; this.style.textShadow='1px 1px 3px rgba(0,0,0,0.3)'; this.style.zIndex='${index === 0 ? 10 : 1}';"
        >${word}</span>`;
    }).join('');
    
    // Create container WITHOUT any background or borders - pure word cloud
    container.innerHTML = `
        <div class="pure-word-cloud" style="
            position: relative;
            width: 100%;
            height: 500px;
            margin: 0;
            padding: 0;
            background: transparent;
            border: none;
            box-shadow: none;
            overflow: visible;
        ">
            ${cloudHTML}
        </div>
    `;
    
    console.log('✨ Beautiful word cloud generated successfully!');
}

function downloadWordCloud() {
    const container = document.getElementById('wordCloudContainer');
    
    if (!container || container.innerHTML.includes('אין מספיק תגובות')) {
        showToast('⚠️ אין ענן מילים להורדה');
        return;
    }
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const canvasWidth = 1200;
    const canvasHeight = 800;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Set background
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Get all word elements
    const wordElements = container.querySelectorAll('.word-cloud-word');
    
    if (wordElements.length === 0) {
        showToast('⚠️ לא נמצאו מילים בענן המילים');
        return;
    }
    
    // Add title
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(`ענן מילים - ${currentBoard ? currentBoard.question : 'לוח אינטראקטיבי'}`, canvasWidth / 2, 50);
    
    // Draw words on canvas
    let currentX = 100;
    let currentY = 120;
    const maxWidth = canvasWidth - 200;
    const lineHeight = 80;
    
    wordElements.forEach((wordEl, index) => {
        const word = wordEl.textContent;
        const fontSize = parseInt(wordEl.style.fontSize);
        const color = wordEl.style.color;
        
        // Get rotation
        const transform = wordEl.style.transform;
        const rotationMatch = transform.match(/rotate\(([^)]+)deg\)/);
        const rotation = rotationMatch ? parseFloat(rotationMatch[1]) : 0;
        
        // Set font
        const fontWeight = fontSize > 35 ? 'bold' : fontSize > 25 ? '600' : 'normal';
        ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = color;
        
        // Measure text
        const textWidth = ctx.measureText(word).width;
        
        // Check if we need a new line
        if (currentX + textWidth > maxWidth) {
            currentX = 100;
            currentY += lineHeight;
        }
        
        // Make sure we don't go off the canvas
        if (currentY > canvasHeight - 50) {
            return; // Skip remaining words if they don't fit
        }
        
        // Save context for rotation
        ctx.save();
        
        // Move to word position and rotate
        ctx.translate(currentX + textWidth / 2, currentY);
        if (rotation !== 0) {
            ctx.rotate((rotation * Math.PI) / 180);
        }
        
        // Draw the word centered
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(word, 0, 0);
        
        // Restore context
        ctx.restore();
        
        // Update position
        currentX += textWidth + 30;
    });
    
    // Add footer
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    const currentDate = new Date().toLocaleDateString('he-IL');
            ctx.fillText(`נוצר באמצעות SnapBoard - ${currentDate}`, canvasWidth / 2, canvasHeight - 20);
    
    // Convert canvas to image and download
    try {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `word-cloud-${currentBoard ? currentBoard.code : 'snapboard'}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showToast('✅ ענן המילים הורד בהצלחה!');
        }, 'image/png');
    } catch (error) {
        console.error('Error creating download:', error);
        showToast('⚠️ שגיאה בהורדת התמונה');
    }
}

function debugWordCloud() {
    console.log('=== 🔍 DETAILED WORD CLOUD DEBUG ===');
    
    if (responses.length === 0) {
        alert('❌ אין תגובות ליצירת ענן מילים');
        return;
    }
    
    console.log(`📊 Found ${responses.length} responses:`);
    responses.forEach((response, index) => {
        console.log(`  ${index + 1}. "${response.text}" (by ${response.author || 'אנונימי'})`);
    });
    
    const allText = responses.map(r => r.text).join(' ');
    console.log('📝 Combined text:', allText);
    
    // Process text step by step
    console.log('\n🔄 Step-by-step processing:');
    
    const words = extractWords(allText);
    const wordCounts = countWords(words);
    
    // Find words that appear in text but not in cloud
    const wordsInText = allText.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    const wordsInCloud = wordCounts.map(([word]) => word);
    const missingWords = [...new Set(wordsInText)].filter(word => 
        !wordsInCloud.includes(word) && 
        !hebrewStopWords.includes(word) &&
        !/^\d+$/.test(word)
    );
    
    console.log('🔍 Analysis Results:');
    console.log(`  📊 Total words in text: ${wordsInText.length}`);
    console.log(`  📊 Unique words in text: ${[...new Set(wordsInText)].length}`);
    console.log(`  📊 Words in cloud: ${wordCounts.length}`);
    console.log(`  ⚠️ Words missing from cloud: ${missingWords.length}`);
    
    if (missingWords.length > 0) {
        console.log('❌ Missing words:', missingWords.slice(0, 10).join(', '));
    }
    
    // Show top words in cloud
    console.log('\n🏆 Top 10 words in cloud:');
    wordCounts.slice(0, 10).forEach(([word, count], index) => {
        console.log(`  ${index + 1}. "${word}" (${count} פעמים)`);
    });
    
    // Create detailed summary
    const summary = `
🔍 דיבוג מפורט של ענן המילים:

📊 סטטיסטיקות:
• תגובות: ${responses.length}
• מילים בטקסט: ${wordsInText.length} (${[...new Set(wordsInText)].length} ייחודיות)
• מילים בענן: ${wordCounts.length}
• מילים חסרות: ${missingWords.length}

${missingWords.length > 0 ? `❌ דוגמאות למילים חסרות: ${missingWords.slice(0, 5).join(', ')}` : '✅ כל המילים הרלוונטיות מופיעות'}

🏆 המילים הפופולריות ביותר:
${wordCounts.slice(0, 5).map(([word, count]) => `• ${word} (${count})`).join('\n')}

📋 הטקסט המלא: "${allText}"

🔧 פתרון: אם יש מילים חסרות, בדוק שהן לא ברשימת המילים המסוננות
    `;
    
    alert(summary);
    console.log('========================');
    
    // Force update word cloud
    setTimeout(() => {
        console.log('🔄 Force updating word cloud...');
        updateWordCloud();
    }, 1000);
}

function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d5a400;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(213, 164, 0, 0.3);
        z-index: 10000;
        font-weight: 500;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Clean up listeners when leaving the page
window.addEventListener('beforeunload', () => {
    if (responsesListener) {
        responsesListener();
    }
});

// Make debug function globally available for testing
window.debugWordCloud = debugWordCloud;

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 