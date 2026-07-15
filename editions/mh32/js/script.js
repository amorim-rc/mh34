document.addEventListener('DOMContentLoaded', () => {
    // Function to handle form submission and send JSON data
    function handleFormSubmission(event) {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData(event.target);
        const data = {
            name: formData.get('name'),
            companion: formData.get('companion') === 'with-company',
            gift: Array.from(formData.getAll('gift[]'))
        };

        // Create an XMLHttpRequest to send JSON data
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://birthday-helper-63535451b824.herokuapp.com/api/guest', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Form submitted successfully:', xhr.responseText);
                    alert('Obrigada =)'); // Pop-up for successful submission
                    location.reload(); // Refresh the page to see the updated list
                } else {
                    console.error('Form submission failed:', xhr.status, xhr.statusText);
                    alert('Form submission failed!');
                }
            }
        };
        xhr.send(JSON.stringify(data));
    }

    // Add event listener for form submission
    const form = document.getElementById('guestForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }

    // Fetch gift data and populate the select element
    function populateGifts() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://birthday-helper-63535451b824.herokuapp.com/api/gifts', true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    console.log('Received data:', data); // Debugging: Log received data
                    const giftSelect = document.getElementById('gift');
                    giftSelect.innerHTML = ''; // Clear existing options

                    // Add the default and segmentation options
                    giftSelect.innerHTML = `
                        <option value="">Selecione um presente</option>
                    `;

                    // Group the gifts by segmentation
                    const groups = {
                        A: 'R$ 50 até R$ 100',
                        B: 'R$ 100 até R$ 150',
                        C: 'R$ 150 até R$ 200',
                        D: 'R$ 200 até R$ 250',
                        E: 'R$ 250 até R$ 300',
                        F: 'R$ 300 até R$ 450',
                        G: 'R$ 450 até R$ 650'
                    };

                    for (const segment in groups) {
                        const header = document.createElement('option');
                        header.value = "";
                        header.disabled = true;
                        header.style.color = 'navy';
                        header.style.fontSize = '14px';
                        header.style.fontWeight = 'bold';
                        header.textContent = groups[segment];
                        giftSelect.appendChild(header);

                        data.filter(item => item.segmentation === segment && !item.bought).forEach(item => {
                            const option = document.createElement('option');
                            option.value = item.gift;
                            option.dataset.giftUrl = item.giftUrl;
                            option.textContent = item.gift;
                            giftSelect.appendChild(option);
                        });
                    }

                    // Add event listener to display gift link when a gift is selected
                    giftSelect.addEventListener('change', (event) => {
                        const selectedOption = event.target.selectedOptions[0];
                        const giftLinkDisplay = document.getElementById('giftLinkDisplay');
                        if (selectedOption && selectedOption.dataset.giftUrl) {
                            giftLinkDisplay.innerHTML = `Link: <a href="${selectedOption.dataset.giftUrl}" target="_blank">${selectedOption.dataset.giftUrl}</a>`;
                        } else {
                            giftLinkDisplay.innerHTML = '';
                        }
                    });
                } else {
                    console.error('Fetch error:', xhr.status, xhr.statusText); // Debugging: Log fetch errors
                }
            }
        };
        xhr.send();
    }

    populateGifts(); // Call the function to populate gifts on page load
});
